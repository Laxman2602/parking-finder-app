require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const sgMail = require('@sendgrid/mail');
const Razorpay = require('razorpay');
const cron = require('node-cron');
const multer = require('multer');
const path = require('path');

// ========== FORCE SSL FOR POSTGRESQL (FIX FOR NEON) ==========
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

// ========== UPDATED CORS FOR DEPLOYMENT ==========
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true 
}));
app.use(express.json());

// ========== HEALTH CHECK ENDPOINT FOR RENDER ==========
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ========== SERVE STATIC IMAGES ==========
app.use('/images', express.static('images'));

// ========== MULTER CONFIGURATION FOR IMAGE UPLOAD ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only images (jpeg, jpg, png) are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ========== DATABASE CONNECTION WITH SSL FOR NEON (UPDATED TO USE DATABASE_URL) ==========
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

pool.connect((err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to PostgreSQL');
});

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ========== RAZORPAY INITIALIZATION ==========
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper: verify Razorpay payment signature
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${orderId}|${paymentId}`);
  const generatedSignature = hmac.digest('hex');
  return generatedSignature === signature;
};

// ========== MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Rate limiter for forgot-password (max 3 requests per hour per IP)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many requests. Please try again later.' },
});

// ========== CRON JOB: RELEASE SLOTS WITH NO FUTURE BOOKINGS ==========
cron.schedule('* * * * *', async () => {
  const nowUTC = new Date().toISOString();
  console.log(`Checking for expired bookings at UTC: ${nowUTC}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const expired = await client.query(`
      SELECT DISTINCT s.id AS slot_id
      FROM slots s
      WHERE s.status = 'booked'
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.slot_id = s.id
            AND b.end_time > NOW()
            AND b.payment_status = 'paid'
        )
    `);
    for (const slot of expired.rows) {
      console.log(`Releasing slot ${slot.slot_id} because no future bookings exist`);
      await client.query('UPDATE slots SET status = $1 WHERE id = $2', ['available', slot.slot_id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error releasing expired bookings:', err);
  } finally {
    client.release();
  }
});

// ========== PUBLIC ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, username, password, role, full_name, phone } = req.body;
  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2 OR phone = $3',
      [email, username, phone]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email, username, or phone already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, role, full_name, phone) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, username, role, full_name`,
      [email, username, hashed, role, full_name, phone]
    );
    const token = jwt.sign({ id: result.rows[0].id, role: result.rows[0].role }, process.env.JWT_SECRET);
    res.json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role, full_name: user.full_name }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role, full_name FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get nearby parking (includes image_url)
app.get('/api/parking/nearby', async (req, res) => {
  const { lat, lng, radius = 5 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
  try {
    const query = `
      SELECT 
        p.id, p.name, p.latitude, p.longitude, p.address, 
        p.price_per_hour, p.total_slots, p.image_url,
        COALESCE(
          (SELECT COUNT(*) FROM slots WHERE parking_area_id = p.id AND status = 'available'),
          0
        ) as available_slots,
        (6371 * acos(
          cos(radians($1)) * cos(radians(p.latitude)) * 
          cos(radians(p.longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(p.latitude))
        )) as distance
      FROM parking_areas p
      WHERE p.is_active = true
        AND (6371 * acos(
          cos(radians($1)) * cos(radians(p.latitude)) * 
          cos(radians(p.longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(p.latitude))
        )) < $3
      ORDER BY distance
    `;
    const result = await pool.query(query, [lat, lng, radius]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get slots for a parking area
app.get('/api/parking/:id/slots', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, slot_number, status FROM slots WHERE parking_area_id = $1 ORDER BY slot_number', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PROTECTED ROUTES ==========

// Create a pending booking (slot is not marked as booked yet)
app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { slot_id, start_time, end_time, total_price } = req.body;
  const user_id = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const overlap = await client.query(
      `SELECT id FROM bookings 
       WHERE slot_id = $1 
       AND (start_time, end_time) OVERLAPS ($2, $3)`,
      [slot_id, start_time, end_time]
    );
    if (overlap.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Slot already booked for that time period' });
    }
    const booking = await client.query(
      `INSERT INTO bookings (user_id, slot_id, start_time, end_time, total_price, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [user_id, slot_id, start_time, end_time, total_price, 'pending']
    );
    await client.query('COMMIT');
    res.json({ booking_id: booking.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Confirm payment and mark slot as booked (used by old flow – kept for compatibility)
app.post('/api/bookings/:id/confirm-payment', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { razorpay_payment_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bookingRes = await client.query(
      'SELECT slot_id, user_id, payment_status FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (bookingRes.rows.length === 0) throw new Error('Booking not found');
    const booking = bookingRes.rows[0];
    if (booking.payment_status !== 'pending') {
      return res.status(400).json({ error: 'Booking already processed' });
    }
    await client.query('UPDATE slots SET status = $1 WHERE id = $2', ['booked', booking.slot_id]);
    await client.query(
      `UPDATE bookings SET payment_status = $1, razorpay_payment_id = $2 WHERE id = $3`,
      ['paid', razorpay_payment_id, id]
    );
    await client.query('COMMIT');

    // Send confirmation email
    try {
      const userInfo = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [booking.user_id]);
      const slotInfo = await pool.query('SELECT slot_number FROM slots WHERE id = $1', [booking.slot_id]);
      const parkingInfo = await pool.query(`SELECT p.name, p.price_per_hour FROM parking_areas p JOIN slots s ON s.parking_area_id = p.id WHERE s.id = $1`, [booking.slot_id]);
      const bookingDetails = await pool.query('SELECT start_time, end_time, total_price FROM bookings WHERE id = $1', [id]);
      const { start_time, end_time, total_price } = bookingDetails.rows[0];
      const msg = {
        to: userInfo.rows[0].email,
        from: 'anonymous11162611@gmail.com',
        subject: 'Booking Confirmed - ParkEase',
        html: `<p>Hello ${userInfo.rows[0].full_name},</p>
               <p>Your booking for ${parkingInfo.rows[0].name}, Slot ${slotInfo.rows[0].slot_number} has been confirmed.</p>
               <p>Duration: ${new Date(start_time).toLocaleString()} to ${new Date(end_time).toLocaleString()}</p>
               <p>Amount Paid: ₹${total_price}</p>
               <p>Thank you for using ParkEase!</p>`
      };
      await sgMail.send(msg);
      console.log(`Confirmation email sent to ${userInfo.rows[0].email}`);
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
    }

    res.json({ success: true, message: 'Payment confirmed, slot booked' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Old payment update endpoint (kept for compatibility)
app.put('/api/bookings/:id/payment', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { payment_status, razorpay_payment_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE bookings SET payment_status = $1, razorpay_payment_id = $2 WHERE id = $3 RETURNING *',
      [payment_status, razorpay_payment_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CANCEL PENDING BOOKING ==========
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bookingRes = await client.query(
      'SELECT slot_id, payment_status FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (bookingRes.rows.length === 0) throw new Error('Booking not found');
    const { payment_status } = bookingRes.rows[0];
    if (payment_status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel a booking that is already paid or failed' });
    }
    await client.query('DELETE FROM bookings WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== OWNER DASHBOARD ROUTES ==========

// Owner: Get all parking areas owned by this owner (active only)
app.get('/api/owner/parking-areas', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  try {
    const result = await pool.query('SELECT * FROM parking_areas WHERE owner_id = $1 AND is_active = true', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner: Get a single parking area (for edit form)
app.get('/api/owner/parking/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM parking_areas WHERE id = $1 AND owner_id = $2', [id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner: Update a parking area
app.put('/api/owner/parking/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  const { id } = req.params;
  const { name, latitude, longitude, address, price_per_hour, image_url } = req.body;
  try {
    const check = await pool.query('SELECT owner_id FROM parking_areas WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Parking area not found' });
    if (check.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Not your parking area' });

    const result = await pool.query(
      `UPDATE parking_areas 
       SET name = $1, latitude = $2, longitude = $3, address = $4, price_per_hour = $5, image_url = $6
       WHERE id = $7 RETURNING *`,
      [name, latitude, longitude, address, price_per_hour, image_url, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner: Disable (soft delete) a parking area
app.delete('/api/owner/parking/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT owner_id FROM parking_areas WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Parking area not found' });
    if (check.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Not your parking area' });

    await pool.query('UPDATE parking_areas SET is_active = false WHERE id = $1', [id]);
    res.json({ success: true, message: 'Parking area disabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner: Upload image for a parking area
app.post('/api/owner/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imageUrl = `/images/${req.file.filename}`;
  res.json({ image_url: imageUrl });
});

// Owner: Add a new parking area (with image_url)
app.post('/api/owner/parking', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can perform this action' });
  const { name, latitude, longitude, address, price_per_hour, total_slots, image_url } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO parking_areas (owner_id, name, latitude, longitude, address, price_per_hour, total_slots, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, name, latitude, longitude, address, price_per_hour, total_slots, image_url || null]
    );
    const parkingId = result.rows[0].id;
    for (let i = 1; i <= total_slots; i++) {
      await client.query(
        'INSERT INTO slots (parking_area_id, slot_number, status) VALUES ($1, $2, $3)',
        [parkingId, `P-${i}`, 'available']
      );
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Owner: Update slot status
app.put('/api/owner/slots/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query('UPDATE slots SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner: Get dashboard stats (only active parking areas)
app.get('/api/owner/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM parking_areas WHERE owner_id = $1 AND is_active = true) as total_parkings,
        (SELECT COUNT(*) FROM slots s 
         JOIN parking_areas p ON s.parking_area_id = p.id 
         WHERE p.owner_id = $1 AND p.is_active = true AND s.status = 'available') as available_slots,
        (SELECT COUNT(*) FROM slots s 
         JOIN parking_areas p ON s.parking_area_id = p.id 
         WHERE p.owner_id = $1 AND p.is_active = true AND s.status = 'booked') as booked_slots,
        COALESCE((
          SELECT SUM(b.total_price) 
          FROM bookings b 
          JOIN slots s ON b.slot_id = s.id 
          JOIN parking_areas p ON s.parking_area_id = p.id 
          WHERE p.owner_id = $1 AND b.payment_status = 'paid' AND p.is_active = true
        ), 0) as total_revenue
    `, [req.user.id]);
    res.json(result.rows[0] || { total_parkings: 0, available_slots: 0, booked_slots: 0, total_revenue: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User: Get my bookings
app.get('/api/user/bookings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.start_time, b.end_time, b.total_price, b.payment_status,
             s.slot_number, p.name as parking_name
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN parking_areas p ON s.parking_area_id = p.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner: Get all bookings for their parking areas
app.get('/api/owner/bookings', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  try {
    const result = await pool.query(`
      SELECT b.id, b.start_time, b.end_time, b.total_price, b.payment_status,
             s.slot_number, p.name as parking_name, u.email as user_email, u.full_name as user_name
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN parking_areas p ON s.parking_area_id = p.id
      JOIN users u ON b.user_id = u.id
      WHERE p.owner_id = $1
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== FILTERED BOOKINGS FOR OWNER DASHBOARD ==========
app.get('/api/owner/bookings/filtered', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' });
  const { parkingAreaId, year, month } = req.query;
  let query = `
    SELECT b.id, b.start_time, b.end_time, b.total_price, b.payment_status,
           s.slot_number, p.name as parking_name, u.email as user_email, u.full_name as user_name,
           p.id as parking_id
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    JOIN parking_areas p ON s.parking_area_id = p.id
    JOIN users u ON b.user_id = u.id
    WHERE p.owner_id = $1
  `;
  const params = [req.user.id];
  let paramIndex = 2;

  if (parkingAreaId && parkingAreaId !== 'all') {
    query += ` AND p.id = $${paramIndex}`;
    params.push(parkingAreaId);
    paramIndex++;
  }
  if (year && month) {
    query += ` AND EXTRACT(YEAR FROM b.start_time) = $${paramIndex} AND EXTRACT(MONTH FROM b.start_time) = $${paramIndex+1}`;
    params.push(year, month);
  }
  query += ` ORDER BY b.start_time DESC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== RAZORPAY PAYMENT ROUTES ==========
// 1. Create a Razorpay order
app.post('/api/create-order', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const options = {
    amount: amount * 100,
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    payment_capture: 1,
  };
  try {
    const order = await razorpay.orders.create(options);
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// 2. Verify payment after frontend success
app.post('/api/verify-payment', authenticateToken, async (req, res) => {
  const { order_id, payment_id, signature, booking_id } = req.body;
  console.log(`[VERIFY] Received: booking_id=${booking_id}, order_id=${order_id}, payment_id=${payment_id}`);
  if (!order_id || !payment_id || !signature || !booking_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const isValid = verifyRazorpaySignature(order_id, payment_id, signature);
  if (!isValid) return res.status(400).json({ error: 'Invalid payment signature' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bookingRes = await client.query(
      'SELECT slot_id, total_price FROM bookings WHERE id = $1 AND payment_status = $2 FOR UPDATE',
      [booking_id, 'pending']
    );
    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log(`[VERIFY] Booking ${booking_id} not found or already processed`);
      return res.status(404).json({ error: 'Booking not found or already processed' });
    }
    const { slot_id } = bookingRes.rows[0];
    console.log(`[VERIFY] Updating slot ${slot_id} to booked for booking ${booking_id}`);
    const slotUpdate = await client.query('UPDATE slots SET status = $1 WHERE id = $2 RETURNING status', ['booked', slot_id]);
    console.log(`[VERIFY] Slot update result: ${slotUpdate.rows[0]?.status}`);
    await client.query(
      'UPDATE bookings SET payment_status = $1, razorpay_payment_id = $2 WHERE id = $3',
      ['paid', payment_id, booking_id]
    );
    await client.query('COMMIT');
    console.log(`[VERIFY] Success: slot ${slot_id} booked, booking ${booking_id} paid`);
    res.json({ success: true, message: 'Payment verified, slot booked' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[VERIFY] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ========== FORGOT / RESET PASSWORD (using SendGrid) ==========
app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or username required' });
  try {
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }
    const user = userResult.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const msg = {
      to: user.email,
      from: 'anonymous11162611@gmail.com',
      subject: 'Reset Your Password - ParkEase',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
          <div style="max-width:500px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
            <div style="background:#2563eb;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;">ParkEase</h1>
              <p style="margin:8px 0 0;color:#dbeafe;">Secure Parking, Simplified</p>
            </div>
            <div style="padding:24px;">
              <h2 style="margin:0 0 16px;color:#1f2937;">Password Reset Request</h2>
              <p style="margin:0 0 12px;color:#4b5563;">Hello,</p>
              <p style="margin:0 0 24px;color:#4b5563;">We received a request to reset your password. Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
              </div>
              <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;word-break:break-all;background:#f9fafb;padding:12px;border-radius:8px;">${resetLink}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">If you didn't request this, please ignore this email.</p>
              <p style="margin:0;font-size:14px;color:#6b7280;">Your password will remain unchanged.</p>
            </div>
            <div style="border-top:1px solid #e5e7eb;padding:20px;text-align:center;background:#f9fafb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; 2026 ParkEase. All rights reserved.</p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Find parking effortlessly</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    try {
      await sgMail.send(msg);
      console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('SendGrid email error:', error.response?.body || error.message);
      console.log(`[FALLBACK] Reset link for ${user.email}: ${resetLink}`);
    }
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ error: 'Token and new password required' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const tokenResult = await pool.query('SELECT user_id, expires_at FROM password_resets WHERE token = $1', [token]);
    if (tokenResult.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link.' });
    const { user_id, expires_at } = tokenResult.rows[0];
    if (new Date() > expires_at) {
      await pool.query('DELETE FROM password_resets WHERE token = $1', [token]);
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user_id]);
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user_id]);
    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ========== UPDATED SERVER LISTENING FOR DEPLOYMENT (FIXED) ==========
const PORT = process.env.PORT || 5001;

// Start the server (always listen, regardless of environment)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export for serverless platforms (Vercel) - only if needed
if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
  module.exports = app;
}