import React from 'react';
import { SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';

/**
 * Global SafeAreaWrapper component
 * Wraps all screens with consistent safe area handling
 */
const SafeAreaWrapper = ({ children, style }) => {
  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    // Add padding for Android to account for status bar
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});

export default SafeAreaWrapper;
