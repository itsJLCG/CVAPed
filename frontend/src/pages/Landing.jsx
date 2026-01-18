import React from 'react';
import { useNavigate } from 'react-router-dom';
import { images, hasImage } from '../assets/images';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-left">
            <div className="logo-container">
              {hasImage('logo') ? (
                <img src={images.logo} alt="CVAPed Logo" className="logo-image" />
              ) : (
                <div className="logo-placeholder">LOGO</div>
              )}
              {hasImage('cvacareText') ? (
                <img src={images.cvacareText} alt="CVAPed" className="brand-text-image" />
              ) : (
                <div className="brand-text">CVAPed</div>
              )}
            </div>
          </div>
          <div className="nav-right">
            <button className="nav-btn login-btn" onClick={() => navigate('/login')}>
              Login
            </button>
            <button className="nav-btn register-btn" onClick={() => navigate('/register')}>
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-left">
            <h1 className="hero-title">A Mobile and Web System</h1>
            <div className="hero-brand">
              {hasImage('cvacareText') ? (
                <img src={images.cvacareText} alt="CVAPed" className="hero-brand-image" />
              ) : (
                <div className="brand-image-placeholder">CVAPed</div>
              )}
            </div>
            
            <div className="partner-logos">
              <div className="partner-logo">
                {hasImage('tupLogo') ? (
                  <img src={images.tupLogo} alt="TUP" className="partner-logo-image" />
                ) : (
                  <div className="logo-placeholder-small">TUPT</div>
                )}
                <span>Technological University of the Philippines - Taguig</span>
              </div>
              <div className="partner-logo">
                {hasImage('iLoveTaguig') ? (
                  <img src={images.iLoveTaguig} alt="I Love Taguig" className="partner-logo-image" />
                ) : (
                  <div className="logo-placeholder-small">❤️</div>
                )}
                <span>I Love Taguig</span>
              </div>
              <div className="partner-logo">
                {hasImage('taguigPRU') ? (
                  <img src={images.taguigPRU} alt="Taguig PRU" className="partner-logo-image" />
                ) : (
                  <div className="logo-placeholder-small">🏥</div>
                )}
                <span>Taguig Physical Medicine and Rehabilitation Unit</span>
              </div>
            </div>

            <div className="hero-description">
              <p>
                CVAPed is a comprehensive mobile and web-based system designed to revolutionize 
                therapy management for stroke patients and pediatric speech therapy. Our innovative 
                platform combines cutting-edge technology with compassionate care, providing seamless 
                coordination between patients, therapists, and healthcare providers.
              </p>
              <p>
                Through CVAPed, we bridge the gap between physical therapy for stroke rehabilitation 
                and speech therapy for children, offering personalized treatment plans, progress tracking, 
                and real-time communication tools. Our mission is to enhance the quality of life for 
                patients and streamline the therapeutic process for healthcare professionals.
              </p>
            </div>

            <div className="hero-cta">
              <button className="cta-btn primary-cta" onClick={() => navigate('/register')}>
                Get Started
              </button>
              <button className="cta-btn secondary-cta" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </div>

          <div className="hero-right">
            <div className="jelly-circle"></div>
            <div className="device-showcase">
              {/* CVAPed Logo Floating */}
              {hasImage('logo') && (
                <div className="floating-logo floating">
                  <img src={images.logo} alt="CVAPed Logo" className="logo-floating-image" />
                </div>
              )}
              
              <div className="web-device floating">
                {hasImage('webSystem') ? (
                  <img src={images.webSystem} alt="Web System" className="device-image" />
                ) : (
                  <div className="device-screen">
                    <div className="screen-placeholder coming-soon">
                      <div className="coming-soon-badge">Coming Soon</div>
                      <div className="coming-soon-title">Application QR Code</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mobile-device floating-delayed">
                {hasImage('mobileApp') ? (
                  <img src={images.mobileApp} alt="CVAPed Android" className="device-image mobile-img" />
                ) : (
                  <div className="device-screen mobile">
                    <div className="screen-placeholder">CVAPed Android</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">Comprehensive therapy solutions designed for optimal patient care and recovery</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">🏥</div>
              </div>
              <h3>Physical Therapy for Stroke Patients</h3>
              <p>Expert-led rehabilitation programs tailored for stroke recovery. Our specialized approach combines traditional therapy methods with modern technology to help patients regain mobility, strength, and independence.</p>
              <ul className="feature-benefits">
                <li>Personalized treatment plans</li>
                <li>Real-time progress monitoring</li>
                <li>Exercise tracking and guidance</li>
              </ul>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">💬</div>
              </div>
              <h3>Pediatric Speech Therapy</h3>
              <p>Comprehensive speech and language therapy services for children. We focus on articulation, fluency, language development, and receptive communication skills through engaging and evidence-based interventions.</p>
              <ul className="feature-benefits">
                <li>Articulation & pronunciation training</li>
                <li>Language comprehension exercises</li>
                <li>Fluency development programs</li>
              </ul>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">📊</div>
              </div>
              <h3>Advanced Progress Tracking</h3>
              <p>State-of-the-art analytics and reporting system that provides detailed insights into therapy progress. Monitor improvements, identify trends, and make data-driven decisions for optimal outcomes.</p>
              <ul className="feature-benefits">
                <li>Comprehensive performance metrics</li>
                <li>Visual progress reports</li>
                <li>Predictive mastery analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Meet The Team Section */}
      <section className="team-section">
        <div className="team-container">
          <h2 className="section-title">Meet The Team</h2>
          <div className="team-grid">
            {/* City Mayor */}
            <div className="team-card special">
              {hasImage('mayorLani') ? (
                <img src={images.mayorLani} alt="Hon. Lani Cayetano" className="team-image" />
              ) : (
                <div className="team-image-placeholder">👤</div>
              )}
              <h3>Hon. Lani Cayetano</h3>
              <p className="team-role">City Mayor</p>
            </div>

            {/* Medical Team */}
            <div className="team-card medical">
              {hasImage('drNathaniel') ? (
                <img src={images.drNathaniel} alt="Dr. Noel Nathaniel C. Napa" className="team-image" />
              ) : (
                <div className="team-image-placeholder">👤</div>
              )}
              <h3>Dr. Noel Nathaniel C. Napa</h3>
              <p className="team-credentials">MD, FPARM, DPARM</p>
              <p className="team-role">Physical Medicine and Rehabilitation Unit</p>
              <p className="team-position">Head/Physiatrist</p>
            </div>

            <div className="team-card medical">
              <div className="team-image-placeholder">👤</div>
              <h3>Ms. Christine Joy R. Cabardo</h3>
              <p className="team-credentials">PTRP</p>
              <p className="team-role">Physical Medicine and Rehabilitation Unit</p>
              <p className="team-position">Chief Physical Therapist</p>
            </div>

            {/* Thesis Adviser */}
            <div className="team-card special">
              <div className="team-image-placeholder">👤</div>
              <h3>Sir. Nestor R. Valdez</h3>
              <p className="team-role">Thesis Adviser</p>
            </div>

            {/* Developers */}
            <div className="team-card">
              {hasImage('jhonLudwig') ? (
                <img src={images.jhonLudwig} alt="Jhon Ludwig C. Gayapa" className="team-image" />
              ) : (
                <div className="team-image-placeholder">👤</div>
              )}
              <h3>Jhon Ludwig C. Gayapa</h3>
              <p className="team-role">Developer</p>
            </div>

            <div className="team-card">
              {hasImage('gwynBarte') ? (
                <img src={images.gwynBarte} alt="Gwyn S. Barte" className="team-image" />
              ) : (
                <div className="team-image-placeholder">👤</div>
              )}
              <h3>Gwyn S. Barte</h3>
              <p className="team-role">Developer</p>
            </div>

            <div className="team-card">
              {hasImage('kristineMae') ? (
                <img src={images.kristineMae} alt="Kristine Mae P. Prado" className="team-image" />
              ) : (
                <div className="team-image-placeholder">👤</div>
              )}
              <h3>Kristine Mae P. Prado</h3>
              <p className="team-role">Developer</p>
            </div>

            <div className="team-card">
              {hasImage('jhunMark') ? (
                <img src={images.jhunMark} alt="Jhun Mark G. Obreros" className="team-image" />
              ) : (
                <div className="team-image-placeholder">👤</div>
              )}
              <h3>Jhun Mark G. Obreros</h3>
              <p className="team-role">Developer</p>
            </div>

            
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>CVACare</h4>
            <p>Empowering recovery through innovative therapy management for stroke patients and pediatric speech therapy.</p>
          </div>
          <div className="footer-section">
            <h4>Partnered With</h4>
            <ul>
              <li>Technological University of the Philippines - Taguig</li>
              <li>Taguig Physical Medicine and Rehabilitation Unit</li>
              <li>City Government of Taguig</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Services</h4>
            <ul>
              <li>Physical Therapy</li>
              <li>Pediatric Speech Therapy</li>
              <li>Progress Tracking & Analytics</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CVACare. A thesis project by TUP-Taguig students. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
