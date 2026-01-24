import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TherapyScreen from './TherapyScreen';
import ProfileScreen from './ProfileScreen';
import HealthScreen from './HealthScreen';
import PredictionsScreen from './PredictionsScreen';
import PrescriptiveScreen from './PrescriptiveScreen';
import BottomNav from './BottomNav';

const { width, height } = Dimensions.get('window');

const HomePage = ({ userData, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'therapy', 'profile', 'health'
  const scrollViewRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const carouselAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const card4Anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Trigger animations on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(carouselAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger card animations
    Animated.stagger(100, [
      Animated.spring(card1Anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(card2Anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(card3Anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(card4Anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for call-to-action
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prevSlide) => {
        const nextSlide = (prevSlide + 1) % carouselItems.length;
        scrollViewRef.current?.scrollTo({
          x: nextSlide * width,
          animated: true,
        });
        return nextSlide;
      });
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Carousel data explaining the system
  const carouselItems = [
    { 
      id: 1, 
      title: 'Welcome to CVAPed', 
      subtitle: 'Cerebrovascular Accident & Pediatric Care',
      description: 'Comprehensive stroke and pediatric rehabilitation platform',
      color: '#C9302C',
      icon: 'heart-circle'
    },
    { 
      id: 2, 
      title: 'Physical Therapy', 
      subtitle: 'Stroke Rehabilitation',
      description: 'Gait analysis and mobility exercises for CVA patients',
      color: '#9B59B6',
      icon: 'walk'
    },
    { 
      id: 3, 
      title: 'Speech Therapy', 
      subtitle: 'Pediatric Rehabilitation',
      description: 'Articulation, fluency, and language exercises for children',
      color: '#6B9AC4',
      icon: 'chatbubbles'
    },
    { 
      id: 4, 
      title: 'Track Progress', 
      subtitle: 'Monitor Your Journey',
      description: 'View detailed health logs and therapy analytics',
      color: '#4CAF50',
      icon: 'analytics'
    },
  ];

  const handleSearch = () => {
    console.log('Search query:', searchQuery);
    // Implement search functionality later
  };

  const handleTabPress = (tab) => {
    console.log('Tab pressed:', tab);
    setActiveTab(tab);
    setCurrentScreen(tab); // Single atomic state update
    console.log('✅ Navigating to', tab, 'screen');
  };

  const handleTherapyBack = () => {
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handleProfileBack = () => {
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handleHealthBack = () => {
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handlePredictionsBack = () => {
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handlePrescriptiveBack = () => {
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handleNavigateFromTherapy = (destination) => {
    console.log('Navigating from therapy to:', destination);
    setActiveTab(destination);
    setCurrentScreen(destination);
  };

  const handleTherapyCardPress = () => {
    setActiveTab('therapy');
    setCurrentScreen('therapy');
  };

  const handleHealthCardPress = () => {
    setActiveTab('health');
    setCurrentScreen('health');
  };

  // Handle manual scroll for carousel
  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setActiveSlide(index);
  };

  // Show Profile screen if profile tab is active
  if (currentScreen === 'profile') {
    return (
      <View style={styles.container}>
        <ProfileScreen 
          userData={userData} 
          onBack={handleProfileBack}
          onLogout={onLogout}
        />
        <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  // Show Health screen if health tab is active
  if (currentScreen === 'health') {
    console.log('🏥 Rendering HealthScreen component');
    return (
      <View style={styles.container}>
        <HealthScreen onBack={handleHealthBack} />
        <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  // Show Predictions screen if predictions tab is active
  if (currentScreen === 'predictions') {
    return (
      <View style={styles.container}>
        <PredictionsScreen onBack={handlePredictionsBack} />
        <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  // Show Prescriptive screen if prescriptive tab is active
  if (currentScreen === 'prescriptive') {
    return (
      <View style={styles.container}>
        <PrescriptiveScreen onBack={handlePrescriptiveBack} />
        <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  // Show Therapy screen if therapy tab is active
  if (currentScreen === 'therapy') {
    return <TherapyScreen onBack={handleTherapyBack} onNavigate={handleNavigateFromTherapy} />;
  }

  return (
    <View style={styles.container}>
      {/* Upper Navbar with Gradient Effect */}
      <View style={styles.topNavbar}>
        <Animated.View 
          style={[
            styles.navContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIconWrapper}>
              <Image 
                source={require('../assets/cvalogonotext.png')} 
                style={styles.logoIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.logoTextWrapper}>
              <Image 
                source={require('../assets/CVAPed_Text.png')} 
                style={styles.logoText}
                resizeMode="contain"
              />
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Carousel with Animation */}
        <Animated.View 
          style={[
            styles.carouselContainer,
            {
              opacity: carouselAnim,
              transform: [{
                scale: carouselAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }
          ]}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {carouselItems.map((item, index) => (
              <View
                key={item.id}
                style={[styles.carouselItem, { backgroundColor: item.color }]}
              >
                <View style={styles.carouselIconContainer}>
                  <Ionicons name={item.icon} size={70} color="#FFFFFF" />
                </View>
                <Text style={styles.carouselText}>{item.title}</Text>
                <Text style={styles.carouselSubtitle}>{item.subtitle}</Text>
                <Text style={styles.carouselDescription}>{item.description}</Text>
              </View>
            ))}
          </ScrollView>
          
          {/* Carousel Indicators */}
          <View style={styles.indicatorContainer}>
            {carouselItems.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.indicator, 
                  index === activeSlide && styles.activeIndicator
                ]} 
              />
            ))}
          </View>
        </Animated.View>

        {/* Featured Therapy Modules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Therapy Programs</Text>
            <TouchableOpacity onPress={handleTherapyCardPress}>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickActionsGrid}>
            <Animated.View style={{ opacity: card1Anim, transform: [{ scale: card1Anim }] }}>
              <TouchableOpacity 
                style={[styles.quickActionCard]}
                onPress={handleTherapyCardPress}
                activeOpacity={0.8}
              >
                <View style={[styles.cardGradient, { backgroundColor: '#FF6B6B' }]}>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>PEDIATRIC</Text>
                  </View>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="mic" size={36} color="#FFFFFF" />
                  </View>
                  <Text style={styles.quickActionText}>Articulation</Text>
                  <Text style={styles.quickActionSubtext}>Speech therapy for kids</Text>
                  <View style={styles.cardFooter}>
                    <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.cardFooterText}>15-20 min</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            <Animated.View style={{ opacity: card2Anim, transform: [{ scale: card2Anim }] }}>
              <TouchableOpacity 
                style={[styles.quickActionCard]}
                onPress={handleTherapyCardPress}
                activeOpacity={0.8}
              >
                <View style={[styles.cardGradient, { backgroundColor: '#4ECDC4' }]}>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>PEDIATRIC</Text>
                  </View>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="chatbubbles" size={36} color="#FFFFFF" />
                  </View>
                  <Text style={styles.quickActionText}>Language</Text>
                  <Text style={styles.quickActionSubtext}>Pediatric communication</Text>
                  <View style={styles.cardFooter}>
                    <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.cardFooterText}>10-15 min</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            <Animated.View style={{ opacity: card3Anim, transform: [{ scale: card3Anim }] }}>
              <TouchableOpacity 
                style={[styles.quickActionCard]}
                onPress={handleTherapyCardPress}
                activeOpacity={0.8}
              >
                <View style={[styles.cardGradient, { backgroundColor: '#F4A460' }]}>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>PEDIATRIC</Text>
                  </View>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="volume-high" size={36} color="#FFFFFF" />
                  </View>
                  <Text style={styles.quickActionText}>Fluency</Text>
                  <Text style={styles.quickActionSubtext}>Pediatric speech flow</Text>
                  <View style={styles.cardFooter}>
                    <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.cardFooterText}>12-18 min</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            <Animated.View style={{ opacity: card4Anim, transform: [{ scale: card4Anim }] }}>
              <TouchableOpacity 
                style={[styles.quickActionCard]}
                onPress={handleTherapyCardPress}
                activeOpacity={0.8}
              >
                <View style={[styles.cardGradient, { backgroundColor: '#9B59B6' }]}>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>STROKE</Text>
                  </View>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="walk" size={36} color="#FFFFFF" />
                  </View>
                  <Text style={styles.quickActionText}>Physical</Text>
                  <Text style={styles.quickActionSubtext}>CVA gait therapy</Text>
                  <View style={styles.cardFooter}>
                    <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.cardFooterText}>20-25 min</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <TouchableOpacity 
            style={styles.healthCard}
            onPress={handleHealthCardPress}
            activeOpacity={0.8}
          >
            <View style={styles.healthCardGradient}>
              <View style={styles.healthCardLeft}>
                <View style={styles.healthIconContainer}>
                  <Ionicons name="heart" size={36} color="#FFFFFF" />
                </View>
                <View style={styles.healthInfo}>
                  <Text style={styles.healthCardTitle}>Health Dashboard</Text>
                  <Text style={styles.healthCardSubtext}>View all therapy logs & progress</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Motivational CTA */}
        <Animated.View 
          style={[
            styles.section,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <View style={styles.ctaCard}>
            <View style={styles.ctaIconCircle}>
              <Ionicons name="rocket" size={40} color="#3498DB" />
            </View>
            <Text style={styles.ctaTitle}>Start Your Session! 🎯</Text>
            <Text style={styles.ctaSubtext}>
              You're doing amazing! Let's continue building on your progress today.
            </Text>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={handleTherapyCardPress}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaButtonText}>BEGIN THERAPY</Text>
              <Ionicons name="arrow-forward-circle" size={24} color="#3498DB" />
            </TouchableOpacity>
            <View style={styles.ctaStats}>
              <View style={styles.ctaStatItem}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.ctaStatText}>Personalized</Text>
              </View>
              <View style={styles.ctaStatItem}>
                <Ionicons name="trending-up" size={18} color="#FFFFFF" />
                <Text style={styles.ctaStatText}>Track Progress</Text>
              </View>
              <View style={styles.ctaStatItem}>
                <Ionicons name="time" size={18} color="#FFFFFF" />
                <Text style={styles.ctaStatText}>Flexible Time</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Tips Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={24} color="#F39C12" />
            <Text style={styles.sectionTitle}>Today's Tip</Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              💡 <Text style={styles.tipBold}>Pro Tip:</Text> Practice for 15 minutes daily for best results. Consistency is key to improvement!
            </Text>
          </View>
        </View>

        {/* Bottom spacing for navbar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Navbar */}
      <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Top Navbar with Gradient
  topNavbar: {
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#C9302C',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  navContent: {
    paddingVertical: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoIconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logoIcon: {
    width: 150,
    height: 150,
  },
  logoTextWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logoText: {
    width: 140,
    height: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },

  // Content
  content: {
    flex: 1,
  },

  // Hero Carousel
  carouselContainer: {
    marginBottom: 15,
  },
  carousel: {
    height: 240,
  },
  carouselItem: {
    width: width,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  carouselIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  carouselText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  carouselSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.95,
    marginBottom: 8,
    textAlign: 'center',
  },
  carouselDescription: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 15,
    lineHeight: 19,
    marginBottom: 12,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#C9302C',
    width: 24,
  },

  // Section
  section: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  seeAllText: {
    fontSize: 13,
    color: '#C9302C',
    fontWeight: '600',
  },

  // Therapy Cards Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 45) / 2,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  cardGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  quickActionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 6,
  },
  quickActionSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 3,
    textAlign: 'center',
    opacity: 0.9,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  cardFooterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Health Card
  healthCard: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  healthCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: '#E74C3C',
  },
  healthCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  healthIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  healthInfo: {
    flex: 1,
  },
  healthCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  healthCardSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },

  // CTA Card
  ctaCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#3498DB',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  ctaIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtext: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    gap: 8,
    marginBottom: 16,
  },
  ctaButtonText: {
    color: '#3498DB',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  ctaStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    flexWrap: 'wrap',
  },
  ctaStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ctaStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },

  // Tip Card
  tipCard: {
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tipText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  tipBold: {
    fontWeight: 'bold',
    color: '#F39C12',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 80,
  },
});

export default HomePage;
