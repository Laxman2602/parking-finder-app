import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Select from 'react-select';
import { FaEnvelope, FaLock, FaUser, FaPhone, FaUserTag, FaEye, FaEyeSlash, FaCar, FaArrowLeft } from 'react-icons/fa';

// List of country codes
const countryCodes = [
  { value: '+91', label: '+91 (India)' },
  { value: '+1', label: '+1 (USA/Canada)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+61', label: '+61 (Australia)' },
  { value: '+86', label: '+86 (China)' },
  { value: '+81', label: '+81 (Japan)' },
  { value: '+49', label: '+49 (Germany)' },
  { value: '+33', label: '+33 (France)' },
  { value: '+7', label: '+7 (Russia)' },
  { value: '+55', label: '+55 (Brazil)' },
  { value: '+20', label: '+20 (Egypt)' },
  { value: '+966', label: '+966 (Saudi Arabia)' },
  { value: '+971', label: '+971 (UAE)' },
  { value: '+92', label: '+92 (Pakistan)' },
  { value: '+880', label: '+880 (Bangladesh)' },
  { value: '+94', label: '+94 (Sri Lanka)' },
  { value: '+977', label: '+977 (Nepal)' },
];

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phoneNumber: '',
    countryCode: countryCodes[0],
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateForm = () => {
    const errors = {};
    if (!formData.full_name.trim()) errors.full_name = 'Full name required';
    if (!formData.username.trim()) errors.username = 'Username required';
    if (formData.username.length < 3) errors.username = 'Username at least 3 characters';
    if (!formData.email.match(/^\S+@\S+\.\S+$/)) errors.email = 'Valid email required';
    const fullPhone = formData.countryCode.value + formData.phoneNumber;
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number required';
    else if (!formData.phoneNumber.match(/^[0-9]{7,15}$/)) errors.phoneNumber = 'Enter 7-15 digits only';
    if (formData.password.length < 6) errors.password = 'Password at least 6 characters';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
  };

  const handleCountryChange = (selected) => {
    setFormData({ ...formData, countryCode: selected });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setError('');
    setLoading(true);
    const fullPhone = formData.countryCode.value + formData.phoneNumber;
    try {
      const res = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          username: formData.username,
          email: formData.email,
          phone: fullPhone,
          password: formData.password,
          role: formData.role
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      login(data.user, data.token);
      if (data.user.role === 'owner') navigate('/owner/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1600")',
          filter: 'brightness(0.7)'
        }}
      ></div>
      <div className="fixed inset-0 z-0 bg-black/40"></div>

      {/* Header */}
      <header className="relative z-10 bg-white/90 backdrop-blur-md shadow-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <FaCar className="text-blue-600 text-2xl" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ParkEase</h1>
          </Link>
          <Link to="/" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
            <FaArrowLeft /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-grow flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-500 hover:scale-105">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Create Account</h2>
          <p className="text-center text-gray-600 mb-6">Join ParkEase today</p>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-800 mb-2 font-medium">Full Name</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaUser className="text-gray-500 mr-2" />
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500" placeholder="John Doe" required />
              </div>
              {fieldErrors.full_name && <p className="text-red-500 text-sm mt-1">{fieldErrors.full_name}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-gray-800 mb-2 font-medium">Username (for login)</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaUserTag className="text-gray-500 mr-2" />
                <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500" placeholder="john_doe" required />
              </div>
              {fieldErrors.username && <p className="text-red-500 text-sm mt-1">{fieldErrors.username}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-gray-800 mb-2 font-medium">Email Address</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaEnvelope className="text-gray-500 mr-2" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500" placeholder="you@example.com" required />
              </div>
              {fieldErrors.email && <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-gray-800 mb-2 font-medium">Phone Number</label>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <Select
                    options={countryCodes}
                    value={formData.countryCode}
                    onChange={handleCountryChange}
                    className="text-gray-900"
                    styles={{ control: (base) => ({ ...base, borderColor: '#d1d5db', boxShadow: 'none', '&:hover': { borderColor: '#3b82f6' } }) }}
                  />
                </div>
                <div className="flex-1 flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                  <FaPhone className="text-gray-500 mr-2" />
                  <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500" placeholder="9876543210" required />
                </div>
              </div>
              {fieldErrors.phoneNumber && <p className="text-red-500 text-sm mt-1">{fieldErrors.phoneNumber}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-gray-800 mb-2 font-medium">Password</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaLock className="text-gray-500 mr-2" />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-700">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-gray-800 mb-2 font-medium">Confirm Password</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaLock className="text-gray-500 mr-2" />
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-gray-500 hover:text-gray-700">
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-gray-800 mb-2 font-medium">I am a</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value="user" checked={formData.role === 'user'} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-800">User</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value="owner" checked={formData.role === 'owner'} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-800">Parking Owner</span>
                </label>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50">
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
          <p className="text-center text-gray-700 mt-6">Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link></p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-md text-gray-800 py-6">
        <div className="text-center">© 2026 ParkEase. All rights reserved.</div>
      </footer>
    </div>
  );
}