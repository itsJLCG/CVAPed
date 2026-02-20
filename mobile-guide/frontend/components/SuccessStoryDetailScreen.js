import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SuccessStoryDetailScreen = ({ story, onBack }) => {
  if (!story) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Success Story</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Story not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Success Story</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Story Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Ionicons name="star" size={20} color="#27AE60" />
            <Text style={styles.badgeText}>SUCCESS STORY</Text>
          </View>
        </View>

        {/* Patient Name */}
        <Text style={styles.patientName}>{story.patientName}</Text>

        {/* Images */}
        {story.images && story.images.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScrollView}
          >
            {story.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.storyImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        {/* Story Content */}
        <View style={styles.storyContainer}>
          <View style={styles.storyHeader}>
            <Ionicons name="book-outline" size={24} color="#27AE60" />
            <Text style={styles.storyTitle}>Their Journey</Text>
          </View>
          <Text style={styles.storyText}>{story.story}</Text>
        </View>

        {/* Metadata */}
        <View style={styles.metadataContainer}>
          <View style={styles.metadataItem}>
            <Ionicons name="calendar-outline" size={20} color="#7F8C8D" />
            <Text style={styles.metadataText}>
              {new Date(story.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Inspiration Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.inspirationBox}>
            <Ionicons name="heart" size={32} color="#E74C3C" />
            <Text style={styles.inspirationText}>
              Every recovery story inspires hope and shows what's possible with dedication and support.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },

  // Content
  content: {
    flex: 1,
  },

  // Badge
  badgeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  badgeText: {
    color: '#27AE60',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Patient Name
  patientName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  // Images
  imageScrollView: {
    marginBottom: 20,
  },
  storyImage: {
    width: width,
    height: 300,
    backgroundColor: '#E0E0E0',
  },

  // Story Content
  storyContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  storyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  storyText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#34495E',
    textAlign: 'justify',
  },

  // Metadata
  metadataContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metadataText: {
    fontSize: 14,
    color: '#7F8C8D',
  },

  // Footer
  footerContainer: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  inspirationBox: {
    backgroundColor: '#FFF5F5',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  inspirationText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});

export default SuccessStoryDetailScreen;
