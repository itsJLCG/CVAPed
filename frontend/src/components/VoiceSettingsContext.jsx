import React, { createContext, useContext, useState } from 'react';

const VoiceSettingsContext = createContext();

export function VoiceSettingsProvider({ children }) {
  const [voiceSpeed, setVoiceSpeedState] = useState(() => {
    const saved = localStorage.getItem('voiceSpeed');
    return saved ? parseFloat(saved) : 1.0;
  });

  const setVoiceSpeed = (speed) => {
    setVoiceSpeedState(speed);
    localStorage.setItem('voiceSpeed', speed.toString());
  };

  return (
    <VoiceSettingsContext.Provider value={{ voiceSpeed, setVoiceSpeed }}>
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  return useContext(VoiceSettingsContext);
}
