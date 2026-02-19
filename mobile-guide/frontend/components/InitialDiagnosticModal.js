import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const InitialDiagnosticModal = ({ isOpen, onClose, onConfirm, loading }) => {
  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Initial Diagnostic Check</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.modalBody}>
            <Text style={styles.diagnosticIcon}>🏥</Text>
            <Text style={styles.diagnosticQuestion}>
              Have you already had an initial diagnostic assessment or visited our facility?
            </Text>
            <Text style={styles.diagnosticDescription}>
              This helps us personalize your therapy experience and provide the most appropriate recommendations for your care plan.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.btnDiagnostic, styles.btnNo]}
              onPress={() => onConfirm(false)}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#374151" />
              ) : (
                <Text style={styles.btnNoText}>No, Not Yet</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnDiagnostic, styles.btnYes]}
              onPress={() => onConfirm(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnYesText}>Yes, I Have</Text>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width - 40,
    maxWidth: 420,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },

  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F8F9FA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },

  // Body
  modalBody: {
    paddingHorizontal: 28,
    paddingVertical: 28,
    alignItems: 'center',
  },
  diagnosticIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  diagnosticQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  diagnosticDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Footer
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  btnDiagnostic: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  btnNoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  btnYes: {
    backgroundColor: '#C9302C',
  },
  btnYesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default InitialDiagnosticModal;
