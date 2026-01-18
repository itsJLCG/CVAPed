import React, { createContext, useState, useContext } from 'react';

const TherapyCategoryContext = createContext();

export const useTherapyCategory = () => {
  const context = useContext(TherapyCategoryContext);
  if (!context) {
    throw new Error('useTherapyCategory must be used within a TherapyCategoryProvider');
  }
  return context;
};

export const TherapyCategoryProvider = ({ children }) => {
  const [selectedCategory, setSelectedCategory] = useState(null); // null, 'physical', or 'speech'

  const selectCategory = (category) => {
    setSelectedCategory(category);
  };

  const clearCategory = () => {
    setSelectedCategory(null);
  };

  return (
    <TherapyCategoryContext.Provider value={{ selectedCategory, selectCategory, clearCategory }}>
      {children}
    </TherapyCategoryContext.Provider>
  );
};
