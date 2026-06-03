import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUserCircle, FaSignOutAlt, FaBook, FaTachometerAlt } from 'react-icons/fa';

export default function UserMenu({ user, logout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitial = () => {
    if (user.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold flex items-center justify-center hover:shadow-lg transition focus:outline-none"
      >
        {getInitial()}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{user.full_name || user.email}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <Link
              to="/my-bookings"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
              onClick={() => setIsOpen(false)}
            >
              <FaBook className="text-blue-500" /> My Bookings
            </Link>
            {user.role === 'owner' && (
              <Link
                to="/owner/dashboard"
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
                onClick={() => setIsOpen(false)}
              >
                <FaTachometerAlt className="text-green-500" /> Dashboard
              </Link>
            )}
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full text-left flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition border-t border-gray-100"
            >
              <FaSignOutAlt className="text-red-500" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
