import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FaCar, FaDownload, FaArrowLeft } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function MyBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5001/api/user/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setBookings(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [token]);

  const downloadReceipt = async (booking) => {
    // Create a temporary div to render receipt content
    const receiptDiv = document.createElement('div');
    receiptDiv.style.width = '400px';
    receiptDiv.style.padding = '20px';
    receiptDiv.style.backgroundColor = '#fff';
    receiptDiv.style.fontFamily = 'Arial, sans-serif';
    receiptDiv.style.borderRadius = '12px';
    receiptDiv.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #2563eb; padding-bottom:10px; margin-bottom:20px;">
        <h2 style="margin:0; color:#1e40af;">ParkEase</h2>
        <p style="margin:0; color:#4b5563;">Parking Receipt</p>
      </div>
      <div style="margin-bottom:16px;">
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Parking:</strong> ${booking.parking_name}</p>
        <p><strong>Slot:</strong> ${booking.slot_number}</p>
        <p><strong>Start Time:</strong> ${new Date(booking.start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}</p>
        <p><strong>End Time:</strong> ${new Date(booking.end_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}</p>
        <p><strong>Amount Paid:</strong> ₹${booking.total_price}</p>
        <p><strong>Payment Status:</strong> ${booking.payment_status.toUpperCase()}</p>
      </div>
      <div style="border-top:1px solid #e5e7eb; margin-top:16px; padding-top:12px; text-align:center; font-size:12px; color:#6b7280;">
        <p>Thank you for using ParkEase</p>
      </div>
    `;
    document.body.appendChild(receiptDiv);
    try {
      const canvas = await html2canvas(receiptDiv, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`ParkEase_Receipt_${booking.id}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF');
    } finally {
      document.body.removeChild(receiptDiv);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1600")',
          filter: 'brightness(0.7)'
        }}
      />
      <div className="fixed inset-0 z-0 bg-black/40" />

      {/* Header */}
      <header className="relative z-10 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition">
            <FaArrowLeft /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <FaCar className="text-blue-600 text-2xl" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              My Bookings
            </h1>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Booking History</h2>
          
          {bookings.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No bookings yet.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map(booking => (
                <div key={booking.id} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex-1">
                      <p><strong>Parking:</strong> {booking.parking_name}</p>
                      <p><strong>Slot:</strong> {booking.slot_number}</p>
                      <p><strong>Start:</strong> {new Date(booking.start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}</p>
                      <p><strong>End:</strong> {new Date(booking.end_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}</p>
                      <p><strong>Amount:</strong> ₹{booking.total_price}</p>
                      <p>
                        <span className={`px-2 py-1 rounded text-sm ${
                          booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {booking.payment_status}
                        </span>
                      </p>
                    </div>
                    {booking.payment_status === 'paid' && (
                      <button
                        onClick={() => downloadReceipt(booking)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                      >
                        <FaDownload /> Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}