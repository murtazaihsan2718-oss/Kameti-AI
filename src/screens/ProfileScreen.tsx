import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Modal, Animated } from 'react-native';
import { ArrowLeft, User, Phone, CreditCard, Save, LogOut, Check } from 'lucide-react-native';
import { UserProfile, PaymentMethod } from '../types/dataTypes';
import { nativeStorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';
import { TactilePressable } from '../components/TactilePressable';

interface ProfileScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
}

function isValidPakistaniPhone(raw: string): boolean {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (/^03\d{9}$/.test(digits)) return true;
  if (/^923\d{9}$/.test(digits)) return true;
  if (/^3\d{9}$/.test(digits)) return true;
  return false;
}

function normalizePakistaniPhone(raw: string): string {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('3') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

const PAYMENT_OPTIONS: { label: string; value: PaymentMethod }[] = [
  { label: 'EasyPaisa', value: 'easypaisa' },
  { label: 'JazzCash', value: 'jazzcash' },
  { label: 'SadaPay', value: 'sadapay' },
  { label: 'NayaPay', value: 'nayapay' },
  { label: 'Bank Account', value: 'bank' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onLogout }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('easypaisa');
  const [accountNumber, setAccountNumber] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (showLogoutConfirm) {
      modalScale.setValue(0.82);
      modalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 38,
          bounciness: 7,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showLogoutConfirm]);

  const loadUser = async () => {
    const data = await nativeStorageService.getUser();
    setUser(data);
    if (data) {
      if (data.name) {
        setName(data.name);
      }
      if (data.phone) {
        setName(data.name);
        setPhone(data.phone);
      }
      if (data.paymentMethod) {
        setPaymentMethod(data.paymentMethod);
      }
      if (data.accountNumber) {
        setAccountNumber(data.accountNumber);
      }
    }
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    if (!isValidPakistaniPhone(phone)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 11-digit Pakistani mobile number (e.g. 0300 1234567).');
      return;
    }

    const norm = normalizePakistaniPhone(phone);
    const formattedPhone = norm.startsWith('03') ? `${norm.slice(0, 4)} ${norm.slice(4)}` : norm;

    const updated = await nativeStorageService.updateUser({
      name: name.trim(),
      phone: formattedPhone,
      paymentMethod,
      accountNumber: accountNumber.trim() || formattedPhone,
    });
    if (updated) {
      await FirebaseService.saveUserProfile(updated);
    }
    Alert.alert('Profile Saved', 'Your payment account details were updated.');
  };

  const closeLogoutModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.88,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLogoutConfirm(false);
      if (callback) {
        callback();
      }
    });
  };

  const confirmLogout = async () => {
    closeLogoutModal(async () => {
      await nativeStorageService.logout();
      if (onLogout) {
        onLogout();
      } else if (onBack) {
        onBack();
      }
    });
  };

  if (!user) {
    return null;
  }

  let displayName = 'Aown Raza';
  if (name) {
    displayName = name;
  }

  let displayPhone = '0314 5550101';
  if (phone) {
    displayPhone = phone;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header with Back Arrow < */}
        <View style={styles.header}>
          {onBack ? (
            <TactilePressable
              style={styles.headerBtn}
              haptic="selection"
              scaleTo={0.9}
              onPress={() => {
                onBack();
              }}
            >
              <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
            </TactilePressable>
          ) : (
            <View style={{ width: 38 }} />
          )}
          <Text style={styles.headerTitle}>Your Profile</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <User size={30} color="#71717A" strokeWidth={2} />
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userPhone}>{displayPhone}</Text>
        </View>

        {/* Form Settings */}
        <View style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>FULL NAME</Text>
            <View style={styles.inputWithIcon}>
              <User size={16} color="#71717A" strokeWidth={2} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>PHONE NUMBER</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={16} color="#71717A" strokeWidth={2} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Preferred Payment Method */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>PREFERRED PAYMENT METHOD</Text>
            <View style={styles.paymentGrid}>
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = paymentMethod === opt.value;
                return (
                  <TactilePressable
                    key={opt.value}
                    style={[styles.paymentPill, isSelected && styles.paymentPillActive]}
                    scaleTo={0.96}
                    haptic="selection"
                    onPress={() => setPaymentMethod(opt.value)}
                  >
                    <Text
                      style={[
                        styles.paymentPillText,
                        isSelected && styles.paymentPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Check size={13} color="#FFFFFF" strokeWidth={3} style={{ marginLeft: 4 }} />
                    )}
                  </TactilePressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>PAYMENT ACCOUNT NUMBER</Text>
            <View style={styles.inputWithIcon}>
              <CreditCard size={16} color="#71717A" strokeWidth={2} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="0300 1234567"
              />
            </View>
          </View>

          {/* Save Details Button */}
          <TactilePressable
            style={styles.saveBtn}
            haptic="success"
            scaleTo={0.97}
            onPress={handleSave}
          >
            <Save size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Save Details</Text>
          </TactilePressable>

          {/* Red Log Out Button */}
          <TactilePressable
            style={styles.logoutBtn}
            haptic="selection"
            scaleTo={0.97}
            onPress={() => {
              setShowLogoutConfirm(true);
            }}
          >
            <LogOut size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 6 }} />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TactilePressable>
        </View>

      </ScrollView>

      {/* Custom Themed Log Out Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="none"
        onRequestClose={() => closeLogoutModal()}
      >
        <Animated.View style={[styles.confirmModalOverlay, { opacity: modalOpacity }]}>
          <Animated.View
            style={[
              styles.confirmModalCard,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            <View style={styles.logoutIconCircleLarge}>
              <LogOut size={24} color="#DC2626" strokeWidth={2.2} />
            </View>
            <Text style={styles.confirmModalTitle}>Log Out?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Are you sure you want to log out of your Kameti AI account?
            </Text>

            <TactilePressable
              style={styles.confirmLogoutBtn}
              haptic="impactHeavy"
              scaleTo={0.96}
              onPress={confirmLogout}
            >
              <Text style={styles.confirmLogoutBtnText}>Log Out</Text>
            </TactilePressable>

            <TactilePressable
              style={styles.confirmCancelBtn}
              haptic="selection"
              scaleTo={0.96}
              onPress={() => closeLogoutModal()}
            >
              <Text style={styles.confirmCancelBtnText}>Cancel</Text>
            </TactilePressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 90,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  headerBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  profileCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
    padding: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  paymentPillActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  paymentPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#71717A',
  },
  paymentPillTextActive: {
    color: '#FFFFFF',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  saveBtn: {
    backgroundColor: '#000000',
    borderRadius: 9999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 9999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  logoutIconCircleLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalSubtitle: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmLogoutBtn: {
    width: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 9999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmLogoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmCancelBtn: {
    width: '100%',
    backgroundColor: '#F4F4F5',
    borderRadius: 9999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    color: '#000000',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
