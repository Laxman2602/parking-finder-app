import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaCar, FaClock, FaRupeeSign, FaCreditCard, FaArrowLeft, FaTimesCircle } from 'react-icons/fa';

export default function Booking() {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { parking, slot } = location.state || {};
  const [duration, setDuration] = useState(1);
  const [totalPrice, setTotalPrice] = useState(parking?.price_per_hour || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    if (parking) {
      setTotalPrice(parking.price_per_hour * duration);
    }
  }, [duration, parking]);

  if (!parking || !slot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-xl">
          <p className="text-gray-700">Invalid booking data.</p>
          <button onClick={() => navigate('/')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">Go Home</button>
        </div>
      </div>
    );
  }

  // Manually delete the pending booking (called by Cancel button and modal close)
  const cancelBooking = async () => {
    if (!bookingId) return;
    const confirmCancel = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmCancel) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');
      alert('Booking cancelled successfully.');
      navigate(`/parking/${parking.id}`, { state: { parking } });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const deletePendingBooking = async () => {
    if (!bookingId) return;
    try {
      await fetch(`http://localhost:5001/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Pending booking auto-deleted');
      setBookingId(null);
    } catch (err) {
      console.error('Auto-delete failed:', err);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const start_time = now.toISOString();
      const end_time = new Date(now.getTime() + duration * 60 * 60 * 1000).toISOString();

      const bookingRes = await fetch('http://localhost:5001/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slot_id: slot.id,
          start_time,
          end_time,
          total_price: totalPrice,
        }),
      });
      const bookingData = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(bookingData.error || 'Failed to create booking');
      const newBookingId = bookingData.booking_id;
      setBookingId(newBookingId);

      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const orderRes = await fetch('http://localhost:5001/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: totalPrice }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'ParkEase',
        description: `${parking.name} - Slot ${slot.slot_number} for ${duration} hour(s)`,
        handler: async (response) => {
          const verifyRes = await fetch('http://localhost:5001/api/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              order_id: orderData.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              booking_id: newBookingId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            alert('Payment successful! Your slot is booked.');
            navigate('/my-bookings');
          } else {
            alert(`Payment verification failed: ${verifyData.error}`);
            await deletePendingBooking();
          }
        },
        modal: {
          ondismiss: async () => {
            console.log('Razorpay modal closed – auto‑cancelling booking');
            await deletePendingBooking();
            setError('Payment cancelled. You can try again.');
            setLoading(false);
          }
        },
        prefill: { name: user.full_name, email: user.email },
        theme: { color: '#2563eb' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.message);
      if (bookingId) await deletePendingBooking();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1600")',
          filter: 'brightness(0.7)'
        }}
      />
      <div className="fixed inset-0 z-0 bg-black/40" />

      <header className="relative z-10 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition">
            <FaArrowLeft /> Back
          </button>
          <div className="flex items-center gap-2">
            <FaCar className="text-blue-600 text-2xl" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Confirm Booking
            </h1>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Booking Summary</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-600">Parking</span>
              <span className="font-semibold text-gray-800">{parking.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-600">Slot</span>
              <span className="font-semibold text-gray-800">{slot.slot_number}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-600">Price per hour</span>
              <span className="font-semibold text-gray-800">₹{parking.price_per_hour}</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
              <FaClock className="text-blue-600" /> Duration (hours)
            </label>
            <select 
              className="w-full border border-gray-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={duration} 
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[1,2,3,4,5].map(h => <option key={h} value={h}>{h} hour(s)</option>)}
            </select>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-semibold flex items-center gap-2">
                <FaRupeeSign className="text-green-600" /> Total Amount
              </span>
              <span className="text-2xl font-bold text-blue-600">₹{totalPrice}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-xl transition transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
            >
              <FaCreditCard /> {loading ? 'Processing...' : 'Pay Now'}
            </button>
            {bookingId && (
              <button
                onClick={cancelBooking}
                disabled={loading}
                className="px-6 bg-gradient-to-r from-red-500 to-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-xl transition disabled:opacity-50"
              >
                <FaTimesCircle /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}