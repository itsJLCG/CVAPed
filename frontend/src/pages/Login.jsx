import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import './Auth.css';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.login(formData);
      toast.success('Login successful! Welcome back.');
      onLogin();
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Navigation Header */}
      <nav className="auth-nav">
        <div className="auth-nav-container">
          <div className="auth-nav-left">
            <img src={images.logo} alt="CVAPed Logo" className="auth-nav-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="auth-nav-text" />
          </div>
          <div className="auth-nav-right">
            <Link to="/" className="auth-nav-link">Home</Link>
            <Link to="/register" className="auth-nav-btn">Register</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="auth-container">
        <div className="auth-content">
          {/* Left Side - Image */}
          <div className="auth-left">
            <div className="auth-image-wrapper">
              <img src={images.imageBig} alt="CVAPed" className="auth-main-image" />
              <div className="auth-image-overlay">
                <h2>Welcome to CVAPed</h2>
                <p>Your trusted partner in Physical & Speech Therapy Management</p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="auth-right">
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h1>Login</h1>
                <p>Welcome back! Please login to your account.</p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>

                <div className="auth-divider">
                  <span>Don't have an account?</span>
                </div>

                <Link to="/register" className="btn btn-secondary">
                  Create Account
                </Link>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="auth-footer">
        <div className="auth-footer-container">
          <div className="footer-left">
            <p>&copy; 2025 CVAPed. All rights reserved.</p>
          </div>
          <div className="footer-right">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#contact">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Login;
