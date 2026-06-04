// Use environment variable for API URL (production) or fallback to localhost
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = 'https://parking-finder-app-1.onrender.com/api';

export const api = {
  // Auth
  register: (data) => fetch(`${API_URL}/auth/register`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(data) 
  }).then(res => res.json()),
  
  login: (data) => fetch(`${API_URL}/auth/login`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(data) 
  }).then(res => res.json()),

  // Parking
  getNearbyParking: (lat, lng, radius = 5) => 
    fetch(`${API_URL}/parking/nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
      .then(res => res.json()),
  
  getSlots: (parkingId) => 
    fetch(`${API_URL}/parking/${parkingId}/slots`)
      .then(res => res.json()),

  // Bookings (requires token)
  createBooking: (token, bookingData) => fetch(`${API_URL}/bookings`, { 
    method: 'POST', 
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}` 
    }, 
    body: JSON.stringify(bookingData) 
  }).then(res => res.json()),

  // ========== ADD THESE FOR COMPLETE FUNCTIONALITY ==========
  
  // Get current user
  getCurrentUser: (token) => fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),

  // Get user's bookings
  getUserBookings: (token) => fetch(`${API_URL}/user/bookings`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),

  // Cancel booking
  cancelBooking: (token, bookingId) => fetch(`${API_URL}/bookings/${bookingId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),

  // Create Razorpay order
  createOrder: (token, amount) => fetch(`${API_URL}/create-order`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ amount })
  }).then(res => res.json()),

  // Verify payment
  verifyPayment: (token, paymentData) => fetch(`${API_URL}/verify-payment`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(paymentData)
  }).then(res => res.json()),

  // Forgot password
  forgotPassword: (identifier) => fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  }).then(res => res.json()),

  // Reset password
  resetPassword: (token, new_password) => fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password })
  }).then(res => res.json()),

  // Owner routes
  getOwnerParkingAreas: (token) => fetch(`${API_URL}/owner/parking-areas`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),

  getOwnerStats: (token) => fetch(`${API_URL}/owner/stats`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),

  addParkingArea: (token, data) => fetch(`${API_URL}/owner/parking`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(data)
  }).then(res => res.json()),

  // Get all bookings for owner
  getOwnerBookings: (token) => fetch(`${API_URL}/owner/bookings`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),

  // Update slot status (owner)
  updateSlotStatus: (token, slotId, status) => fetch(`${API_URL}/owner/slots/${slotId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ status })
  }).then(res => res.json()),

  // Upload image (owner)
  uploadImage: (token, formData) => fetch(`${API_URL}/owner/upload-image`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}` 
    },
    body: formData
  }).then(res => res.json()),
};

export default api;// Force fresh deployment
