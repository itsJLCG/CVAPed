import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const LandingPage = ({ onGetStarted }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Image
          source={require('../assets/cvalogonotext.png')}
          style={styles.leftLogo}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/tpmlogo.png')}
          style={styles.rightLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.contentContainer}>
        <Image
          source={require('../assets/landingcontent.png')}
          style={styles.contentImage}
          resizeMode="cover"
        />
        
        <View style={styles.brandContainer}>
          <Image
            source={require('../assets/CVAPed_Text.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.subtitle}>Empowering Journeys to Recovery</Text>
          <Text style={styles.description}>
            CVAPed provides integrated physical therapy for stroke patients and specialized speech therapy for children, fostering strength, communication, and renewed independence.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={onGetStarted} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  leftLogo: {
    width: 90,
    height: 90,
    transform: [{ scale: 2.75 }],
  },
  rightLogo: {
    width: 90,
    height: 90,
  },
  contentContainer: {
    flex: 1,
  },
  contentImage: {
    width: width,
    height: height * 0.42,
    marginBottom: 15,
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  brandLogo: {
    width: width * 0.65,
    height: 50,
  },
  textContainer: {
    paddingHorizontal: 30,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'justify',
    lineHeight: 22,
    paddingHorizontal: 5,
  },
  buttonContainer: {
    paddingHorizontal: 30,
    paddingBottom: 25,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#C9302C',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#C9302C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 10,
  },
});

export default LandingPage;
