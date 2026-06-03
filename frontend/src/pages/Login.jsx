import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCar, FaArrowLeft, FaUser } from 'react-icons/fa';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
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
      <div className="fixed inset-0 z-0 bg-black/40"></div> {/* Dark overlay for readability */}

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
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Welcome Back</h2>
          <p className="text-center text-gray-600 mb-6">Sign in with email or username</p>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-800 mb-2 font-medium">Email or Username</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaEnvelope className="text-gray-500 mr-2" />
                <FaUser className="text-gray-500" />
                <input
                  type="text"
                  className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500 ml-2"
                  placeholder="email@example.com or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-gray-800 mb-2 font-medium">Password</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaLock className="text-gray-500 mr-2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {/* Forgot Password Link */}
              <div className="flex justify-end mt-1">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="text-center text-gray-700 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">Create one</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-md text-gray-800 py-6">
        <div className="text-center">© 2026 ParkEase. All rights reserved.</div>
      </footer>
    </div>
  );
}