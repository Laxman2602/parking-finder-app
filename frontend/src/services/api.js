const API_URL = 'http://localhost:5000/api';

export const api = {
  // Auth
  register: (data) => fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),
  login: (data) => fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),

  // Parking
  getNearbyParking: (lat, lng, radius = 5) => fetch(`${API_URL}/parking/nearby?lat=${lat}&lng=${lng}&radius=${radius}`).then(res => res.json()),
  getSlots: (parkingId) => fetch(`${API_URL}/parking/${parkingId}/slots`).then(res => res.json()),

  // Bookings (requires token)
  createBooking: (token, bookingData) => fetch(`${API_URL}/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(bookingData) }).then(res => res.json()),
};