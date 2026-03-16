import React, { memo, useCallback, useEffect } from 'react';
import './SidebarDrawer.css';

const SidebarDrawer = memo(function SidebarDrawer({ 
  isOpen, 
  onClose, 
  activeTab, 
  onTabChange,
  speechDropdownOpen,
  onSpeechDropdownToggle,
  sidebarCollapsed,
  onToggleCollapse,
  isMobile 
}) {
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const navItems = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'speech', icon: '🎤', label: 'Speech Therapy', hasDropdown: true },
    { id: 'physical', icon: '🏃', label: 'Physical Therapy' },
    { id: 'recommended-exercises', icon: '🧩', label: 'Recommended Exercise' },
    { id: 'appointments', icon: '📅', label: 'Appointments' },
    { id: 'success-stories', icon: '⭐', label: 'Success Stories' },
    { id: 'reports', icon: '📈', label: 'Reports' },
    { id: 'diagnostics', icon: '🔬', label: 'Diagnostic Comparison' },
    { id: 'pre-evaluation', icon: '📋', label: 'Pre-Evaluation' },
  ];

  const speechSubItems = [
    { id: 'articulation', icon: '🔤', label: 'Articulation' },
    { id: 'language', icon: '📖', label: 'Language' },
    { id: 'fluency', icon: '💬', label: 'Fluency' },
  ];

  const handleNavClick = useCallback((item) => {
    if (item.hasDropdown) {
      onSpeechDropdownToggle();
    } else {
      onTabChange(item.id);
      if (isMobile) onClose();
    }
  }, [isMobile, onClose, onSpeechDropdownToggle, onTabChange]);

  const handleSubItemClick = useCallback((subItemId) => {
    onTabChange(subItemId);
    if (isMobile) onClose();
  }, [isMobile, onClose, onTabChange]);

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <aside className={`sidebar-drawer ${isOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        <button 
          className="sidebar-toggle-btn" 
          onClick={onToggleCollapse}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg 
            className={`toggle-arrow ${sidebarCollapsed ? 'collapsed' : ''}`} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div key={item.id} className="nav-item-wrapper">
              <button
                className={`nav-item ${
                  activeTab === item.id || 
                  (item.hasDropdown && (activeTab === 'articulation' || activeTab === 'language' || activeTab === 'fluency'))
                    ? 'active' 
                    : ''
                }`}
                onClick={() => handleNavClick(item)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.hasDropdown && (
                  <span className={`dropdown-arrow ${speechDropdownOpen ? 'open' : ''}`}>▼</span>
                )}
              </button>
              
              {item.hasDropdown && speechDropdownOpen && (
                <div className={`dropdown-menu ${sidebarCollapsed ? 'collapsed' : ''}`}>
                  {speechSubItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      className={`nav-item sub-item ${activeTab === subItem.id ? 'active' : ''}`}
                      onClick={() => handleSubItemClick(subItem.id)}
                    >
                      <span className="nav-icon">{subItem.icon}</span>
                      <span className="nav-label">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
});

export default SidebarDrawer;
