import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FaPlus, FaEdit, FaTrashAlt, FaParking, FaEye, FaTimes, 
  FaDollarSign, FaMapMarkerAlt, FaCalendarAlt, FaUpload, FaSignOutAlt
} from 'react-icons/fa';

export default function OwnerDashboard() {
  const { token, user, logout } = useAuth();
  const [stats, setStats] = useState({ total_parkings: 0, available_slots: 0, booked_slots: 0, total_revenue: 0 });
  const [parkingAreas, setParkingAreas] = useState([]);
  const [allParkings, setAllParkings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filteredRevenue, setFilteredRevenue] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [currentParking, setCurrentParking] = useState(null);
  const [slots, setSlots] = useState([]);
  const [editForm, setEditForm] = useState({ name: '', address: '', price_per_hour: '', latitude: '', longitude: '', total_slots: '', image_url: '' });
  const [addForm, setAddForm] = useState({ name: '', address: '', price_per_hour: '', latitude: '', longitude: '', total_slots: '', image_url: '' });
  const [filterParkingId, setFilterParkingId] = useState('all');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const getFullImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/images')) return `http://localhost:5001${url}`;
    return url;
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, parkingRes] = await Promise.all([
        fetch('http://localhost:5001/api/owner/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5001/api/owner/parking-areas', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const statsData = await statsRes.json();
      const parkingData = await parkingRes.json();
      setStats(statsData);
      setParkingAreas(parkingData);
      setAllParkings(parkingData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    let url = 'http://localhost:5001/api/owner/bookings/filtered?';
    if (filterParkingId !== 'all') url += `parkingAreaId=${filterParkingId}&`;
    const [year, month] = filterMonth.split('-');
    url += `year=${year}&month=${month}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBookings(data);
    const paid = data.filter(b => b.payment_status === 'paid');
    const total = paid.reduce((sum, b) => sum + parseFloat(b.total_price), 0);
    setFilteredRevenue({ total, count: paid.length });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [filterParkingId, filterMonth]);

  const refreshAll = () => {
    fetchDashboard();
    fetchBookings();
  };

  const handleAddParking = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5001/api/owner/parking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(addForm) // includes image_url
    });
    if (res.ok) {
      setShowAddModal(false);
      refreshAll();
      setAddForm({ name: '', address: '', price_per_hour: '', latitude: '', longitude: '', total_slots: '', image_url: '' });
    } else alert('Failed to add parking');
  };

  const handleUpdateParking = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:5001/api/owner/parking/${currentParking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      setShowEditModal(false);
      refreshAll();
    } else alert('Update failed');
  };

  const handleDisableParking = async (id) => {
    if (window.confirm('Disable this parking area? It will no longer appear to users.')) {
      const res = await fetch(`http://localhost:5001/api/owner/parking/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) refreshAll();
      else alert('Failed to disable');
    }
  };

  const fetchSlots = async (parkingId) => {
    const res = await fetch(`http://localhost:5001/api/parking/${parkingId}/slots`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const sorted = [...data].sort((a, b) => {
      const numA = parseInt(a.slot_number.split('-')[1]);
      const numB = parseInt(b.slot_number.split('-')[1]);
      return numA - numB;
    });
    setSlots(sorted);
  };

  const toggleSlotStatus = async (slotId, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'maintenance' : 'available';
    const res = await fetch(`http://localhost:5001/api/owner/slots/${slotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      setSlots(slots.map(slot => slot.id === slotId ? { ...slot, status: newStatus } : slot));
    } else alert('Failed to update slot');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1600")', filter: 'brightness(0.7)' }} />
      <div className="fixed inset-0 z-0 bg-black/40" />

      <header className="relative z-10 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Owner Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Hello, {user.full_name || user.email}</span>
            <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-red-600 transition">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow text-center">
            <div className="flex items-center justify-center gap-2 mb-2"><FaParking className="text-blue-600 text-2xl" /><h3 className="text-gray-700 font-medium">Total Parkings</h3></div>
            <p className="text-3xl font-bold text-black">{stats.total_parkings}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow text-center">
            <div className="flex items-center justify-center gap-2 mb-2"><FaParking className="text-green-600 text-2xl" /><h3 className="text-gray-700 font-medium">Available Slots</h3></div>
            <p className="text-3xl font-bold text-black">{stats.available_slots}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow text-center">
            <div className="flex items-center justify-center gap-2 mb-2"><FaParking className="text-red-600 text-2xl" /><h3 className="text-gray-700 font-medium">Booked Slots</h3></div>
            <p className="text-3xl font-bold text-black">{stats.booked_slots}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow text-center">
            <div className="flex items-center justify-center gap-2 mb-2"><FaDollarSign className="text-yellow-600 text-2xl" /><h3 className="text-gray-700 font-medium">Total Revenue</h3></div>
            <p className="text-3xl font-bold text-black">₹{stats.total_revenue}</p>
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition">
            <FaPlus /> Add Parking Area
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {parkingAreas.map(area => (
            <div key={area.id} className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden transition hover:scale-105">
              <img src={getFullImageUrl(area.image_url) || 'https://picsum.photos/400/300'} alt={area.name} className="w-full h-40 object-cover" />
              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-800">{area.name}</h3>
                <p className="text-gray-600 text-sm flex items-center gap-1 mt-1"><FaMapMarkerAlt /> {area.address}</p>
                <p className="text-gray-800 font-semibold mt-2">₹{area.price_per_hour}/hr</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => { setCurrentParking(area); setEditForm(area); setShowEditModal(true); }} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm hover:bg-yellow-600 transition"><FaEdit /> Edit</button>
                  <button onClick={() => { setCurrentParking(area); fetchSlots(area.id); setShowSlotsModal(true); }} className="bg-green-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm hover:bg-green-600 transition"><FaEye /> Slots</button>
                  <button onClick={() => handleDisableParking(area.id)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm hover:bg-red-600 transition"><FaTrashAlt /> Disable</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bookings Table - fixed structure */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
          <div className="flex flex-wrap justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaCalendarAlt className="text-blue-600" /> Bookings
            </h2>
            <div className="flex gap-4">
              <select
                value={filterParkingId}
                onChange={(e) => setFilterParkingId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Parking Areas</option>
                {allParkings.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="bg-blue-100 rounded-lg p-3 mb-4">
            <p className="text-gray-800 font-medium">Filtered revenue: <strong className="text-green-700">₹{filteredRevenue.total}</strong> from <strong>{filteredRevenue.count}</strong> paid booking(s)</p>
          </div>
          {bookings.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No bookings for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Parking</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Slot</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Start Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">End Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((b, idx) => (
                    <tr key={b.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-gray-800">{b.parking_name}</td>
                      <td className="px-4 py-2 text-gray-800">{b.slot_number}</td>
                      <td className="px-4 py-2 text-gray-800">{b.user_name || b.user_email}</td>
                      <td className="px-4 py-2 text-gray-800">{new Date(b.start_time).toLocaleString()}</td>
                      <td className="px-4 py-2 text-gray-800">{new Date(b.end_time).toLocaleString()}</td>
                      <td className="px-4 py-2 text-gray-800 font-medium">₹{b.total_price}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          b.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {b.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">➕ Add New Parking Area</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleAddParking} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Shivaji Nagar Parking"
                  className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Address *</label>
                <input
                  type="text"
                  placeholder="Full address"
                  className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  value={addForm.address}
                  onChange={e => setAddForm({ ...addForm, address: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Price per hour (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 30.00"
                  className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  value={addForm.price_per_hour}
                  onChange={e => setAddForm({ ...addForm, price_per_hour: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Latitude *</label>
                  <input
                    type="text"
                    placeholder="e.g., 18.5304"
                    className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                    value={addForm.latitude}
                    onChange={e => setAddForm({ ...addForm, latitude: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Longitude *</label>
                  <input
                    type="text"
                    placeholder="e.g., 73.8467"
                    className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                    value={addForm.longitude}
                    onChange={e => setAddForm({ ...addForm, longitude: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Total slots *</label>
                <input
                  type="number"
                  placeholder="Number of parking slots"
                  className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  value={addForm.total_slots}
                  onChange={e => setAddForm({ ...addForm, total_slots: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Parking Image</label>
                <div className="flex gap-3 items-center">
                  <label htmlFor="addImageUpload" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition flex items-center gap-2">
                    <FaUpload /> Choose File
                  </label>
                  <input
                    id="addImageUpload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const formData = new FormData();
                        formData.append('image', file);
                        try {
                          const res = await fetch('http://localhost:5001/api/owner/upload-image', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: formData
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setAddForm({ ...addForm, image_url: data.image_url });
                            alert('Image uploaded successfully');
                          } else {
                            alert('Upload failed');
                          }
                        } catch (err) {
                          console.error(err);
                          alert('Upload error');
                        }
                      }
                    }}
                  />
                </div>
                {addForm.image_url && (
                  <div className="mt-3">
                    <img src={getFullImageUrl(addForm.image_url)} className="h-24 w-32 object-cover rounded-lg shadow" alt="preview" />
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-[1.02] mt-4"
              >
                ➕ Add Parking Area
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && currentParking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">✏️ Edit Parking Area</h2>
              <button onClick={() => setShowEditModal(false)} className="text-white/80 hover:text-white transition">
                <FaTimes className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleUpdateParking} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Shivaji Nagar Parking"
                  className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Address *</label>
                <input
                  type="text"
                  placeholder="Full address"
                  className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Price per hour (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 30.00"
                  className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  value={editForm.price_per_hour}
                  onChange={e => setEditForm({ ...editForm, price_per_hour: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Latitude</label>
                  <input
                    type="text"
                    placeholder="e.g., 18.5304"
                    className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                    value={editForm.latitude}
                    onChange={e => setEditForm({ ...editForm, latitude: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Longitude</label>
                  <input
                    type="text"
                    placeholder="e.g., 73.8467"
                    className="w-full border border-gray-300 rounded-lg p-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                    value={editForm.longitude}
                    onChange={e => setEditForm({ ...editForm, longitude: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Parking Image</label>
                <div className="flex gap-3 items-center">
                  <label htmlFor="editImageUpload" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition flex items-center gap-2">
                    <FaUpload /> Choose File
                  </label>
                  <input
                    id="editImageUpload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const formData = new FormData();
                        formData.append('image', file);
                        try {
                          const res = await fetch('http://localhost:5001/api/owner/upload-image', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: formData
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setEditForm({ ...editForm, image_url: data.image_url });
                            alert('Image uploaded successfully');
                          } else {
                            alert('Upload failed');
                          }
                        } catch (err) {
                          console.error(err);
                          alert('Upload error');
                        }
                      }
                    }}
                  />
                </div>
                {editForm.image_url && (
                  <div className="mt-3">
                    <img src={getFullImageUrl(editForm.image_url)} className="h-24 w-32 object-cover rounded-lg shadow" alt="preview" />
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-[1.02] mt-4"
              >
                💾 Update Parking Area
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Slots Modal */}
      {showSlotsModal && currentParking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Manage Slots: {currentParking.name}</h2>
              <button onClick={() => setShowSlotsModal(false)} className="text-white hover:text-gray-200 transition">
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-5 gap-3 max-h-96 overflow-auto p-2">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => toggleSlotStatus(slot.id, slot.status)}
                    className={`py-3 rounded-lg text-white font-semibold transition transform hover:scale-105 ${
                      slot.status === 'available' ? 'bg-green-500 hover:bg-green-600 shadow-md' : 
                      slot.status === 'booked' ? 'bg-red-500 cursor-not-allowed opacity-70' : 
                      'bg-gray-500 hover:bg-gray-600'
                    }`}
                    disabled={slot.status === 'booked'}
                  >
                    {slot.slot_number}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center border-t pt-3">
                ℹ️ Click on available/maintenance slots to toggle status. Booked slots cannot be changed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}