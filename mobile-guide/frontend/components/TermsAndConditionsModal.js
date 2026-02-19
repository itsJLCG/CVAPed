import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const TermsAndConditionsModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.sectionText}>
                By accessing and using CVAPed (the "Service"), you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by the above, please do not use 
                this service.
              </Text>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>2. Description of Service</Text>
              <Text style={styles.sectionText}>
                CVAPed provides online speech therapy and physical therapy services, including but not limited to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Speech and language therapy exercises for pediatric patients</Text>
                <Text style={styles.bulletItem}>• Physical therapy and gait analysis for stroke recovery</Text>
                <Text style={styles.bulletItem}>• Progress tracking and therapy management tools</Text>
                <Text style={styles.bulletItem}>• Communication between therapists and patients</Text>
              </View>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>3. User Accounts</Text>
              <Text style={styles.sectionText}>
                To use certain features of the Service, you must register for an account. You agree to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Provide accurate, current, and complete information during registration</Text>
                <Text style={styles.bulletItem}>• Maintain and update your information to keep it accurate and current</Text>
                <Text style={styles.bulletItem}>• Maintain the security of your password and account</Text>
                <Text style={styles.bulletItem}>• Accept all responsibility for all activities that occur under your account</Text>
                <Text style={styles.bulletItem}>• Notify us immediately of any unauthorized use of your account</Text>
              </View>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>4. Privacy and Data Protection</Text>
              <Text style={styles.sectionText}>
                Your privacy is important to us. We collect, use, and protect your personal information in 
                accordance with our Privacy Policy. By using CVAPed, you consent to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• The collection and use of your personal and health information</Text>
                <Text style={styles.bulletItem}>• Storage of therapy session data and progress records</Text>
                <Text style={styles.bulletItem}>• Communication between you and your assigned therapist</Text>
                <Text style={styles.bulletItem}>• Data processing for therapy recommendations and analytics</Text>
              </View>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>5. Medical Disclaimer</Text>
              <Text style={[styles.sectionText, styles.importantText]}>
                <Text style={styles.boldText}>Important:</Text> CVAPed is a supplementary therapy tool and does not replace professional 
                medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified health 
                provider with any questions regarding a medical condition.
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• The Service is not intended for emergency medical situations</Text>
                <Text style={styles.bulletItem}>• Therapy exercises should be performed under professional guidance</Text>
                <Text style={styles.bulletItem}>• Individual results may vary based on patient condition and adherence</Text>
                <Text style={styles.bulletItem}>• Consult with your healthcare provider before starting any therapy program</Text>
              </View>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>6. User Responsibilities</Text>
              <Text style={styles.sectionText}>As a user of CVAPed, you agree to:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Use the Service in accordance with applicable laws and regulations</Text>
                <Text style={styles.bulletItem}>• Not misuse or interfere with the Service</Text>
                <Text style={styles.bulletItem}>• Maintain confidentiality of your login credentials</Text>
                <Text style={styles.bulletItem}>• Report any security breaches or unauthorized access immediately</Text>
              </View>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
              <Text style={styles.sectionText}>
                All content, features, and functionality of CVAPed, including but not limited to text, graphics, 
                logos, and software, are the exclusive property of CVAPed and are protected by copyright, 
                trademark, and other intellectual property laws.
              </Text>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
              <Text style={styles.sectionText}>
                CVAPed and its affiliates shall not be liable for any indirect, incidental, special, consequential, 
                or punitive damages resulting from your use or inability to use the Service, even if we have been 
                advised of the possibility of such damages.
              </Text>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>9. Termination</Text>
              <Text style={styles.sectionText}>
                We reserve the right to terminate or suspend your account and access to the Service at our sole 
                discretion, without notice, for conduct that we believe violates these Terms and Conditions or is 
                harmful to other users, us, or third parties, or for any other reason.
              </Text>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
              <Text style={styles.sectionText}>
                We reserve the right to modify these Terms and Conditions at any time. We will notify users of any 
                material changes by posting the new Terms and Conditions on this page. Your continued use of the 
                Service after such modifications constitutes your acceptance of the updated terms.
              </Text>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>11. Contact Information</Text>
              <Text style={styles.sectionText}>
                If you have any questions about these Terms and Conditions, please contact us at:
              </Text>
              <Text style={styles.contactInfo}>Email: support@cvaped.com</Text>
              <Text style={styles.contactInfo}>Phone: (123) 456-7890</Text>
            </View>

            <View style={[styles.termsSection, styles.lastSection]}>
              <Text style={styles.sectionText}>
                By using CVAPed, you acknowledge that you have read, understood, and agree to be bound by these 
                Terms and Conditions.
              </Text>
              <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeButtonBottom} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingTop: 50, // Give space for status bar and top content
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: '85%', // Take up most of the screen but not all
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  termsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C9302C',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 10,
  },
  importantText: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  bulletList: {
    marginTop: 5,
    marginLeft: 10,
  },
  bulletItem: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  lastSection: {
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 15,
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  closeButtonBottom: {
    backgroundColor: '#C9302C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TermsAndConditionsModal;
