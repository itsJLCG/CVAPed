import React, { useEffect } from 'react';
import './InitialDiagnosticModal.css';

function InitialDiagnosticModal({ isOpen, onClose, onConfirm, loading }) {
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
    <div className="diagnostic-modal-overlay" onClick={onClose}>
      <div className="diagnostic-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="diagnostic-modal-header">
          <h2>Initial Diagnostic Check</h2>
          <button className="diagnostic-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="diagnostic-modal-body">
          <div className="diagnostic-icon">🏥</div>
          <p className="diagnostic-question">
            Have you already had an initial diagnostic assessment or visited our facility?
          </p>
          <p className="diagnostic-description">
            This helps us personalize your therapy experience and provide the most appropriate recommendations for your care plan.
          </p>
        </div>
        <div className="diagnostic-modal-footer">
          <button
            className="btn-diagnostic btn-diagnostic-no"
            onClick={() => onConfirm(false)}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'No, Not Yet'}
          </button>
          <button
            className="btn-diagnostic btn-diagnostic-yes"
            onClick={() => onConfirm(true)}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Yes, I Have'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InitialDiagnosticModal;
