import React, { useEffect } from 'react';
import './TermsAndConditionsModal.css';

function TermsAndConditionsModal({ isOpen, onClose }) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="terms-modal-overlay" onClick={onClose}>
      <div className="terms-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="terms-modal-header">
          <h2>Terms and Conditions</h2>
          <button className="terms-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="terms-modal-body">
          <div className="terms-section">
            <h3>1. Acceptance of Terms</h3>
            <p>
              By accessing and using CVAPed (the "Service"), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do not use 
              this service.
            </p>
          </div>

          <div className="terms-section">
            <h3>2. Description of Service</h3>
            <p>
              CVAPed provides online speech therapy and physical therapy services, including but not limited to:
            </p>
            <ul>
              <li>Speech and language therapy exercises for pediatric patients</li>
              <li>Physical therapy and gait analysis for stroke recovery</li>
              <li>Progress tracking and therapy management tools</li>
              <li>Communication between therapists and patients</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>3. User Accounts</h3>
            <p>
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and update your information to keep it accurate and current</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept all responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>4. Privacy and Data Protection</h3>
            <p>
              Your privacy is important to us. We collect, use, and protect your personal information in 
              accordance with our Privacy Policy. By using CVAPed, you consent to:
            </p>
            <ul>
              <li>The collection and use of your personal and health information</li>
              <li>Storage of therapy session data and progress records</li>
              <li>Communication between you and your assigned therapist</li>
              <li>Data processing for therapy recommendations and analytics</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>5. Medical Disclaimer</h3>
            <p>
              <strong>Important:</strong> CVAPed is a supplementary therapy tool and does not replace professional 
              medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified health 
              provider with any questions regarding a medical condition.
            </p>
            <ul>
              <li>The Service is not intended for emergency medical situations</li>
              <li>Therapy exercises should be performed under professional guidance</li>
              <li>Individual results may vary based on patient condition and adherence</li>
              <li>Consult with your healthcare provider before starting any therapy program</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>6. User Responsibilities</h3>
            <p>You agree to use the Service only for lawful purposes and you agree not to:</p>
            <ul>
              <li>Use the Service in any way that violates applicable laws or regulations</li>
              <li>Share your account credentials with unauthorized persons</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Use the Service to transmit harmful or malicious content</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>7. Intellectual Property</h3>
            <p>
              All content included in or made available through the Service, such as text, graphics, logos, 
              images, audio clips, and software, is the property of CVAPed or its licensors and is protected 
              by copyright and other intellectual property laws.
            </p>
          </div>

          <div className="terms-section">
            <h3>8. Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by law, CVAPed shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages, including loss of profits, data, or other intangible 
              losses resulting from:
            </p>
            <ul>
              <li>Your use or inability to use the Service</li>
              <li>Any unauthorized access to or alteration of your data</li>
              <li>Any interruption or cessation of the Service</li>
              <li>Any bugs, viruses, or other harmful components</li>
            </ul>
          </div>

          <div className="terms-section">
            <h3>9. Termination</h3>
            <p>
              We reserve the right to terminate or suspend your account and access to the Service at our sole 
              discretion, without notice, for conduct that we believe violates these Terms or is harmful to 
              other users, us, or third parties, or for any other reason.
            </p>
          </div>

          <div className="terms-section">
            <h3>10. Changes to Terms</h3>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of any material 
              changes by posting the new Terms on the Service. Your continued use of the Service after such 
              modifications constitutes your acceptance of the updated Terms.
            </p>
          </div>

          <div className="terms-section">
            <h3>11. Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
              in which CVAPed operates, without regard to its conflict of law provisions.
            </p>
          </div>

          <div className="terms-section">
            <h3>12. Contact Information</h3>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> support@cvaped.com<br />
              <strong>Last Updated:</strong> February 1, 2026
            </p>
          </div>
        </div>
        <div className="terms-modal-footer">
          <button className="btn-close-terms" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TermsAndConditionsModal;
