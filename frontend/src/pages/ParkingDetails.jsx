import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCar, FaParking, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';

export default function ParkingDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const parking = location.state?.parking || { name: 'Sample Parking', price_per_hour: 30 };
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5001/api/parking/${parking.id}/slots`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch slots');
        return res.json();
      })
      .then(data => {
        // Sort numerically by slot number
        const sorted = [...data].sort((a, b) => {
          const numA = parseInt(a.slot_number.split('-')[1]);
          const numB = parseInt(b.slot_number.split('-')[1]);
          return numA - numB;
        });
        setSlots(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching slots:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [parking.id]);

  const getSlotStyles = (status) => {
    if (status === 'available') return 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 shadow-md hover:shadow-xl';
    if (status === 'booked') return 'bg-gradient-to-br from-red-400 to-red-600 cursor-not-allowed opacity-70';
    return 'bg-gradient-to-br from-gray-400 to-gray-600 cursor-not-allowed opacity-50';
  };

  const handleSlotClick = (slot) => {
    if (slot.status !== 'available') return;
    setSelectedSlot(slot);
  };

  const handleContinueBooking = () => {
    if (selectedSlot) {
      navigate('/booking', { state: { parking, slot: selectedSlot } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-700">Loading slots...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-4 py-2 rounded">Go Back</button>
      </div>
    );
  }

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
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition">
            <FaArrowLeft /> Back
          </button>
          <div className="flex items-center gap-2">
            <FaCar className="text-blue-600 text-2xl" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {parking.name}
            </h1>
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            ₹{parking.price_per_hour}/hr
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaParking className="text-blue-600" /> Select Parking Slot
          </h2>
          
          {/* Slot Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-4">
            {slots.map(slot => (
              <button
                key={slot.id}
                onClick={() => handleSlotClick(slot)}
                disabled={slot.status !== 'available'}
                className={`
                  ${getSlotStyles(slot.status)} 
                  text-white font-semibold py-3 rounded-xl transition-all duration-200
                  transform hover:scale-105 ${slot.status === 'available' ? 'cursor-pointer' : 'cursor-not-allowed'}
                `}
              >
                {slot.slot_number}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 flex flex-wrap gap-6 justify-center border-t pt-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 shadow"></div>
              <span className="text-gray-700 font-medium">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-500 shadow"></div>
              <span className="text-gray-700 font-medium">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gray-500 shadow"></div>
              <span className="text-gray-700 font-medium">Maintenance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for Selected Slot */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl p-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <FaParking className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-lg">Selected: {selectedSlot.slot_number}</p>
                <p className="text-sm text-gray-500">Price: ₹{parking.price_per_hour}/hour</p>
              </div>
            </div>
            <button
              onClick={handleContinueBooking}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition transform hover:scale-105 flex items-center gap-2"
            >
              <FaCheckCircle /> Continue to Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}