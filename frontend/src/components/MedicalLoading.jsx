import React from 'react';
import './MedicalLoading.css';

/**
 * MedicalSpinner: A medical-themed loading spinner featuring a heartbeat animation
 */
export const MedicalSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  return (
    <div className={`medical-spinner-container size-${size}`}>
      <div className="medical-spinner">
        <div className="heartbeat-wrapper">
          <svg className="heartbeat-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 50 L30 50 L40 20 L50 90 L60 50 L100 50" />
          </svg>
          <div className="medical-cross">+</div>
        </div>
      </div>
      {message && <p className="medical-spinner-message">{message}</p>}
    </div>
  );
};

/**
 * SkeletonCard: Use for stat cards and metric blocks
 */
export const SkeletonCard = ({ width = '100%', height = '140px', className = '' }) => {
  return (
    <div className={`skeleton-card ${className}`} style={{ width, minHeight: height }}>
      <div className="skeleton-card-header">
        <div className="medical-skeleton skeleton-icon"></div>
        <div className="medical-skeleton skeleton-title"></div>
      </div>
      <div className="medical-skeleton skeleton-metric"></div>
    </div>
  );
};

/**
 * SkeletonChart: Placeholders for Bar, Line, or Donut charts
 */
export const SkeletonChart = ({ type = 'bar', height = 300, className = '' }) => {
  return (
    <div className={`skeleton-chart-container ${className}`} style={{ minHeight: height }}>
      <div className="medical-skeleton skeleton-title" style={{ width: '30%' }}></div>
      <div className="medical-skeleton skeleton-title" style={{ width: '50%', height: '14px', marginBottom: '20px' }}></div>
      
      {type === 'bar' || type === 'line' ? (
        <div className="skeleton-chart-bars">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div 
              key={i} 
              className="medical-skeleton skeleton-bar" 
              style={{ height: `${Math.random() * 60 + 20}%` }}
            ></div>
          ))}
        </div>
      ) : (
        <div className="medical-skeleton skeleton-donut"></div>
      )}
    </div>
  );
};

/**
 * SkeletonTable: Placeholder for data tables and lists
 */
export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => {
  return (
    <div className={`skeleton-table ${className}`}>
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="medical-skeleton skeleton-cell" style={{ height: '20px' }}></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rIndex) => (
        <div key={rIndex} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, cIndex) => (
            <div key={cIndex} className="medical-skeleton skeleton-cell" 
                 style={{ width: `${Math.random() * 40 + 40}%`, flex: 'none' }}></div>
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * LoadingOverlay: Wraps a section or block with a translucent overlay and spinner
 */
export const LoadingOverlay = ({ loading, message, children }) => {
  if (!loading) return children;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '200px' }}>
      {children}
      <div className="medical-loading-overlay">
        <MedicalSpinner message={message} />
      </div>
    </div>
  );
};
