import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import './Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters long';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      await authService.register(registerData);
      
      // Clear token and user data from localStorage (don't auto-login)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show success message
      const successMsg = 'Registration successful! Please login with your credentials.';
      setSuccess(successMsg);
      toast.success(successMsg, 4000);
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
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
            <Link to="/login" className="auth-nav-btn">Login</Link>
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
                <h2>Join CVAPed Today</h2>
                <p>Start your journey to better health and wellness management</p>
              </div>
            </div>
          </div>

          {/* Right Side - Register Form */}
          <div className="auth-right">
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h1>Create Account</h1>
                <p>Sign up to get started with CVAPed.</p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

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
                    minLength="6"
                    autoComplete="new-password"
                  />
                  <small className="form-hint">Minimum 6 characters</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your password"
                    minLength="6"
                    autoComplete="new-password"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="auth-divider">
                  <span>Already have an account?</span>
                </div>

                <Link to="/login" className="btn btn-secondary">
                  Login
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

export default Register;
