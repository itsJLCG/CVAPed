import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import DiagnosticProfileCard from '../components/DiagnosticProfileCard';
import InitialDiagnosticModal from '../components/InitialDiagnosticModal';
import { authService } from '../services/api';
import { useToast } from '../components/ToastContext';
import './Diagnostic.css';

function Diagnostic({ onLogout }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [diagnosticData, setDiagnosticData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const storedUser = authService.getStoredUser();
        if (!cancelled) {
          setDiagnosticData(storedUser?.diagnosticData ?? null);
        }

        const meRes = await authService.getMe();
        if (!cancelled && meRes?.data) {
          const freshUser = meRes.data;
          const merged = { ...storedUser, ...freshUser };
          localStorage.setItem('user', JSON.stringify(merged));
          setDiagnosticData(freshUser.diagnosticData ?? null);
        }
      } catch (error) {
        if (!cancelled) console.error('Error loading diagnostic data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const handleDiagnosticSave = async (wizardData) => {
    setModalLoading(true);
    try {
      await authService.saveDiagnosticData(wizardData);
      setDiagnosticData(wizardData);

      const storedUser = authService.getStoredUser();
      const merged = { ...storedUser, diagnosticData: wizardData };
      localStorage.setItem('user', JSON.stringify(merged));

      setShowModal(false);
      toast.success('Diagnostic profile updated successfully!');
    } catch (error) {
      console.error('Error saving diagnostic data:', error);
      toast.error('Failed to save your profile. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="diagnostic-page">
        <Header onLogout={onLogout} />
        <main className="diagnostic-main">
          <div className="diagnostic-loading">Loading your diagnostic profile…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="diagnostic-page">
      <Header onLogout={onLogout} />

      <main className="diagnostic-main">
        <div className="diagnostic-container">
          <div className="diagnostic-page-header">
            <div>
              <h1 className="diagnostic-page-title">🩺 Diagnostic Profile</h1>
              <p className="diagnostic-page-subtitle">Your self-reported initial assessment and therapy recommendation</p>
            </div>
            <button
              className="diagnostic-update-btn"
              onClick={() => setShowModal(true)}
            >
              ✏️ {diagnosticData?.completedWizard ? 'Update Diagnostic' : 'Start Assessment'}
            </button>
          </div>

          {diagnosticData?.completedWizard ? (
            <DiagnosticProfileCard
              diagnosticData={diagnosticData}
            />
          ) : (
            <div className="diagnostic-empty-state">
              <div className="diagnostic-empty-icon">📋</div>
              <h2 className="diagnostic-empty-title">No Diagnostic Profile Yet</h2>
              <p className="diagnostic-empty-text">
                Complete the self-assessment wizard to get a personalized therapy recommendation.
              </p>
              <button
                className="diagnostic-start-btn"
                onClick={() => setShowModal(true)}
              >
                Start Self-Assessment
              </button>
            </div>
          )}
        </div>
      </main>

      <InitialDiagnosticModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleDiagnosticSave}
        loading={modalLoading}
      />
    </div>
  );
}

export default Diagnostic;
