import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaCar, FaArrowLeft } from 'react-icons/fa';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    if (!tokenParam) {
      setError('Invalid reset link. Please request a new one.');
    } else {
      setToken(tokenParam);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setMessage(data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1600")',
          filter: 'brightness(0.6)'
        }}
      />
      <div className="fixed inset-0 z-0 bg-black/30" />

      {/* Header */}
      <header className="relative z-10 bg-white/90 backdrop-blur-md shadow-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <FaCar className="text-blue-600 text-2xl" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ParkEase</h1>
          </Link>
          <Link to="/login" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
            <FaArrowLeft /> Back to Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-grow flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Set New Password</h2>
          <p className="text-center text-gray-600 mb-6">Enter your new password below.</p>
          {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-800 mb-2 font-medium">New Password</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaLock className="text-gray-500 mr-2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-700">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-gray-800 mb-2 font-medium">Confirm Password</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaLock className="text-gray-500 mr-2" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-500 hover:text-gray-700">
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-md text-gray-800 py-6 text-center">
        <p>© 2026 ParkEase. All rights reserved.</p>
      </footer>
    </div>
  );
}