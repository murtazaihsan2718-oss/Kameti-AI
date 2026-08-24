import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Alert, Image } from 'react-native';
import { ArrowLeft, ArrowRight, FileUp, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Committee, Member } from '../types/dataTypes';
import { TactilePressable } from './TactilePressable';

interface PaymentProofModalProps {
  visible: boolean;
  committee: Committee;
  recipient: Member;
  onClose: () => void;
  onSubmitProof?: (imageUrl: string, notes: string) => void;
}

export const PaymentProofModal: React.FC<PaymentProofModalProps> = ({
  visible,
  committee,
  recipient,
  onClose,
  onSubmitProof,
}) => {
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to access your photo gallery to upload payment screenshots.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        if (result.assets) {
          if (result.assets.length > 0) {
            setSelectedImageUri(result.assets[0].uri);
          }
        }
      }
    } catch (e: any) {
      let msg = 'Could not open photo gallery.';
      if (e) {
        if (e.message) {
          msg = e.message;
        }
      }
      Alert.alert('Error picking image', msg);
    }
  };

  const handleSubmit = () => {
    if (!selectedImageUri) {
      Alert.alert('Screenshot Required', 'Please tap the upload box to select your payment screenshot from your gallery.');
      return;
    }

    if (onSubmitProof) {
      onSubmitProof(selectedImageUri, 'Payment screenshot uploaded via app');
    }
    Alert.alert('Payment Proof Submitted', 'Your payment proof has been uploaded for verification ✓');
    setSelectedImageUri(null);
    onClose();
  };

  let formattedAmount = '5,000';
  if (committee) {
    if (committee.contributionAmount) {
      formattedAmount = committee.contributionAmount.toLocaleString();
    }
  }

  let recipientName = 'Sarah Ahmed';
  let recipientMethod = 'EasyPaisa';
  let recipientAccount = '0300 1234567';

  if (recipient) {
    if (recipient.name) {
      recipientName = recipient.name;
    }
    if (recipient.paymentMethod) {
      recipientMethod = recipient.paymentMethod;
    }
    if (recipient.accountNumber) {
      recipientAccount = recipient.accountNumber;
    }
  }

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          
          {/* Header */}
          <View style={styles.header}>
            <TactilePressable
              haptic="selection"
              scaleTo={0.9}
              onPress={() => {
                onClose();
              }}
              style={styles.backBtn}
            >
              <ArrowLeft size={22} color="#000000" strokeWidth={2.5} />
            </TactilePressable>
            <Text style={styles.headerTitle}>Upload Proof</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Amount & Details Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>AMOUNT TO PAY</Text>
            <Text style={styles.amountValue}>Rs. {formattedAmount}</Text>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recipient</Text>
              <Text style={styles.detailValue}>{recipientName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Method</Text>
              <Text style={styles.detailValue}>{recipientMethod}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Number</Text>
              <Text style={styles.detailValue}>{recipientAccount}</Text>
            </View>
          </View>

          {/* Real Photo Gallery Pick Dropzone */}
          <TactilePressable
            style={styles.dropzone}
            haptic="medium"
            scaleTo={0.97}
            onPress={() => {
              handlePickImage();
            }}
          >
            {selectedImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.selectedBadge}>
                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.selectedBadgeText}>Screenshot Attached</Text>
                </View>
                <Text style={styles.changeText}>Tap to choose a different image</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={styles.uploadIconCircle}>
                  <FileUp size={24} color="#000000" strokeWidth={2} />
                </View>
                <Text style={styles.dropzoneTitle}>Tap to upload</Text>
                <Text style={styles.dropzoneSubtitle}>
                  Select a screenshot of your successful transaction from your photo gallery.
                </Text>
              </View>
            )}
          </TactilePressable>

          {/* Submit Action Button */}
          <TactilePressable
            style={styles.submitBtn}
            haptic="success"
            scaleTo={0.97}
            onPress={() => {
              handleSubmit();
            }}
          >
            <Text style={styles.submitBtnText}>Submit Proof</Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TactilePressable>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  amountCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#E4E4E7',
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  dropzone: {
    backgroundColor: '#F4F4F5',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#D4D4D8',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 150,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropzoneTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  dropzoneSubtitle: {
    fontSize: 12.5,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    marginBottom: 10,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 9999,
    gap: 6,
    marginBottom: 6,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  changeText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#000000',
    borderRadius: 9999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
