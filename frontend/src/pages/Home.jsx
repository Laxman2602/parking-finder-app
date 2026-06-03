import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { FaSearch, FaLocationArrow, FaMoneyBillWave, FaCar, FaMapMarkerAlt, FaStar, FaShieldAlt, FaClock, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper: ensure image URL is absolute (prepend backend URL if needed)
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/images')) {
    return `http://localhost:5001${url}`;
  }
  return url;
};

// Default Pune parking spots (fallback if API returns empty)
const defaultParkingSpots = [
  { 
    id: 1, name: 'Shivaji Nagar Parking', latitude: 18.5304, longitude: 73.8467, 
    available_slots: 15, price_per_hour: 30, address: 'Near Fergusson College, Pune', 
    distance: 1.5, image_url: 'http://localhost:5001/images/shivaji.jpg' 
  },
  { 
    id: 2, name: 'FC Road Parking Hub', latitude: 18.5182, longitude: 73.8416, 
    available_slots: 10, price_per_hour: 40, address: 'FC Road, Deccan Gymkhana, Pune', 
    distance: 1.6, image_url: 'http://localhost:5001/images/fcroad.jpg' 
  },
  { 
    id: 3, name: 'Koregaon Park Plaza', latitude: 18.5355, longitude: 73.8842, 
    available_slots: 20, price_per_hour: 60, address: 'Lane No. 5, Koregaon Park, Pune', 
    distance: 3.4, image_url: 'http://localhost:5001/images/koregaon.jpg' 
  },
];

function SetViewOnLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView(location, 14);
    }
  }, [location, map]);
  return null;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [parkingSpots, setParkingSpots] = useState(defaultParkingSpots);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([18.5204, 73.8567]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Get user's real location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = [position.coords.latitude, position.coords.longitude];
          setUserLocation(newLoc);
          setMapCenter(newLoc);
        },
        (error) => console.log("Using default Pune location. Error:", error.message)
      );
    }
  }, []);

  // Fetch nearby parking from backend when mapCenter changes
  useEffect(() => {
    if (mapCenter) {
      setLoading(true);
      fetch(`http://localhost:5001/api/parking/nearby?lat=${mapCenter[0]}&lng=${mapCenter[1]}&radius=15`)
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => {
          if (data && data.length > 0) {
            setParkingSpots(data);
          } else {
            setParkingSpots(defaultParkingSpots);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching parking:', err);
          setParkingSpots(defaultParkingSpots);
          setLoading(false);
        });
    }
  }, [mapCenter]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = [position.coords.latitude, position.coords.longitude];
          setUserLocation(newLoc);
          setMapCenter(newLoc);
        },
        (error) => alert("Unable to get your location. Please enable location permissions.")
      );
    } else {
      alert("Geolocation not supported by your browser.");
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 1) {
      const filtered = parkingSpots.filter(spot =>
        spot.name.toLowerCase().includes(query.toLowerCase()) ||
        (spot.address && spot.address.toLowerCase().includes(query.toLowerCase()))
      );
      setSearchResults(filtered);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FaCar className="text-blue-600 text-2xl" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ParkEase
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <UserMenu user={user} logout={logout} />
            ) : (
              <Link to="/login" className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2 rounded-full hover:shadow-lg transition">
                Login / Register
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 text-center">
          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Find Parking in Seconds
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg opacity-90 max-w-2xl mx-auto"
          >
            Book safe & affordable parking spots near your destination
          </motion.p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="relative">
          <div className="bg-white rounded-2xl shadow-2xl p-2 flex gap-2">
            <div className="flex-1 flex items-center px-4 py-3">
              <FaSearch className="text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search parking by name or location..."
                className="ml-3 w-full outline-none text-gray-800 placeholder-gray-400 bg-transparent"
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => searchQuery.length > 1 && setShowResults(true)}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setShowResults(false); }} className="text-gray-400">
                  <FaTimes />
                </button>
              )}
            </div>
            <button
              onClick={handleUseCurrentLocation}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-md transition"
            >
              <FaLocationArrow /> <span>Current Location</span>
            </button>
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl z-30 max-h-64 overflow-auto">
              {searchResults.map(spot => (
                <div
                  key={spot.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b"
                  onClick={() => {
                    navigate(`/parking/${spot.id}`, { state: { parking: spot } });
                    setShowResults(false);
                  }}
                >
                  <div className="font-semibold text-gray-800">{spot.name}</div>
                  <div className="text-sm text-gray-500">{spot.address}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Section */}
      <div className="max-w-7xl mx-auto px-4 mt-8 mb-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100" style={{ height: '500px', position: 'relative', zIndex: 10 }}>
          <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {parkingSpots.map(spot => (
              <Marker key={spot.id} position={[spot.latitude, spot.longitude]}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">{spot.name}</h3>
                    <p>{spot.available_slots} slots • ₹{spot.price_per_hour}/hr</p>
                    <button
                      onClick={() => navigate(`/parking/${spot.id}`, { state: { parking: spot } })}
                      className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm w-full"
                    >
                      View Slots
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            <SetViewOnLocation location={mapCenter} />
          </MapContainer>
        </div>
      </div>

      {/* Parking Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Nearby Parking</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : parkingSpots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <p className="text-gray-500">No parking spots found nearby. Try a different location or adjust radius.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingSpots.map((spot, index) => (
              <motion.div
                key={spot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <img 
                  src={getImageUrl(spot.image_url) || 'https://picsum.photos/400/300?random=1'} 
                  alt={spot.name}
                  className="w-full h-48 object-cover" 
                  onError={(e) => { e.target.src = 'https://picsum.photos/400/300?random=1'; }}
                />
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{spot.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <FaMapMarkerAlt className="text-gray-400 text-sm" />
                        <span className="text-sm text-gray-500">{spot.address || 'Pune'}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <FaStar className="text-yellow-400 text-sm" />
                        <span className="text-sm text-gray-600">4.5</span>
                        <span className="text-gray-400 text-sm ml-2">{spot.distance ? spot.distance.toFixed(1) : '?'} km</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold ${spot.available_slots > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {spot.available_slots > 0 ? `${spot.available_slots} left` : 'Full'}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <FaMoneyBillWave className="text-green-600" />
                      <span className="font-bold text-gray-800">₹{spot.price_per_hour}<span className="text-gray-500 text-sm">/hr</span></span>
                    </div>
                    <button
                      onClick={() => navigate(`/parking/${spot.id}`, { state: { parking: spot } })}
                      disabled={spot.available_slots === 0}
                      className={`px-4 py-2 rounded-lg font-medium transition ${spot.available_slots > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {spot.available_slots > 0 ? 'Book Now' : 'Unavailable'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-white py-12 mt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 p-3 rounded-full mb-3">
                <FaShieldAlt className="text-blue-600 text-2xl" />
              </div>
              <h3 className="font-semibold text-gray-800">Secure Parking</h3>
              <p className="text-gray-500 text-sm">24/7 CCTV surveillance</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-green-100 p-3 rounded-full mb-3">
                <FaClock className="text-green-600 text-2xl" />
              </div>
              <h3 className="font-semibold text-gray-800">Instant Booking</h3>
              <p className="text-gray-500 text-sm">Reserve in seconds</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-purple-100 p-3 rounded-full mb-3">
                <FaMoneyBillWave className="text-purple-600 text-2xl" />
              </div>
              <h3 className="font-semibold text-gray-800">Best Prices</h3>
              <p className="text-gray-500 text-sm">Compare & save up to 40%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© 2026 ParkEase. All rights reserved.</p>
          <p className="text-sm text-gray-400 mt-2">Find parking effortlessly</p>
        </div>
      </footer>
    </div>
  );
}