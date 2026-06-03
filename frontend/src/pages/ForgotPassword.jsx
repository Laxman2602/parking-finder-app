import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaCar, FaArrowLeft } from 'react-icons/fa';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // Basic validation: if identifier contains '@', it must be a valid email format
    if (identifier.includes('@') && !validateEmail(identifier)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!identifier.trim()) {
      setError('Email or username is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessage(data.message || 'Check your email for reset instructions.');
      setIdentifier('');
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
          filter: 'brightness(0.7)'
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
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Forgot Password?</h2>
          <p className="text-center text-gray-600 mb-6">Enter your email or username to receive a reset link.</p>
          {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-800 mb-2 font-medium">Email or Username</label>
              <div className="flex items-center border border-gray-300 rounded-lg p-3 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <FaEnvelope className="text-gray-500 mr-2" />
                <input
                  type="text"
                  className="w-full outline-none bg-transparent text-gray-900 placeholder-gray-500"
                  placeholder="email@example.com or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
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