import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { User, Phone, CreditCard, ArrowRight, Zap, Check } from 'lucide-react-native';
import { UserProfile, PaymentMethod } from '../types/dataTypes';
import { nativeStorageService } from '../services/storageService';
import { TactilePressable } from '../components/TactilePressable';

interface OnboardingScreenProps {
  onComplete: (user: UserProfile) => void;
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

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [signInPhone, setSignInPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('easypaisa');
  const [accountNumber, setAccountNumber] = useState('');

  const handleStart = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
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

    const normPhone = normalizePakistaniPhone(phone);
    const cleanPhone = normPhone.startsWith('03') ? `${normPhone.slice(0, 4)} ${normPhone.slice(4)}` : normPhone;
    const isDemo = normPhone === '03001234567' || name.toLowerCase().includes('aown');
    const newUser: UserProfile = {
      id: isDemo ? 'usr_aown' : 'u_' + Date.now().toString(36),
      name: name.trim(),
      phone: cleanPhone,
      paymentMethod,
      accountNumber: accountNumber.trim() || cleanPhone,
      accountTitle: name.trim(),
      isNewUser: false,
      stats: {
        activeCommittees: 0,
        completedCommittees: 0,
        totalContributions: 0,
        totalPayouts: 0,
      },
    };

    await nativeStorageService.login(newUser);
    onComplete(newUser);
  };

  const handleSignIn = async () => {
    if (!signInPhone.trim()) {
      Alert.alert('Required', 'Please enter your phone number to sign in.');
      return;
    }
    if (!isValidPakistaniPhone(signInPhone)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 11-digit Pakistani mobile number (e.g. 0300 1234567).');
      return;
    }

    const clean = normalizePakistaniPhone(signInPhone);
    const isDemo = clean === '03001234567';

    let userToLogin: UserProfile;
    if (isDemo) {
      userToLogin = {
        id: 'usr_aown',
        name: 'Aown Raza',
        phone: '0300 1234567',
        paymentMethod: 'easypaisa',
        accountNumber: '03001234567',
        accountTitle: 'Aown Raza',
        isNewUser: false,
        stats: {
          activeCommittees: 2,
          completedCommittees: 1,
          totalContributions: 30000,
          totalPayouts: 60000,
        },
      };
    } else {
      const storedUser = await nativeStorageService.getUser();
      const storedClean = storedUser ? normalizePakistaniPhone(storedUser.phone) : '';
      if (storedUser && storedClean === clean) {
        userToLogin = storedUser;
      } else {
        const formattedPhone = `${clean.slice(0, 4)} ${clean.slice(4)}`;
        userToLogin = {
          id: 'u_' + clean,
          name: storedUser?.name || `User ${clean.slice(-4) || '92'}`,
          phone: formattedPhone,
          paymentMethod: 'easypaisa',
          accountNumber: formattedPhone,
          accountTitle: storedUser?.name || 'Account Holder',
          isNewUser: false,
          stats: {
            activeCommittees: 0,
            completedCommittees: 0,
            totalContributions: 0,
            totalPayouts: 0,
          },
        };
      }
    }

    await nativeStorageService.login(userToLogin);
    onComplete(userToLogin);
  };

  const handleQuickDemoFill = () => {
    setName('Aown Raza');
    setPhone('0300 1234567');
    setPaymentMethod('easypaisa');
    setAccountNumber('03001234567');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandTitle}>Kameti AI</Text>
          <Text style={styles.brandSubtitle}>
            Informal savings committees made simple
          </Text>
        </View>

        {/* Card Form Container */}
        <View style={styles.formCard}>
          
          {/* Mode Switcher Tabs */}
          <View style={styles.tabSwitcher}>
            <TactilePressable
              style={[styles.tabBtn, authMode === 'signup' && styles.tabBtnActive]}
              scaleTo={0.96}
              onPress={() => setAuthMode('signup')}
            >
              <Text style={[styles.tabBtnText, authMode === 'signup' && styles.tabBtnTextActive]}>
                Create Profile
              </Text>
            </TactilePressable>

            <TactilePressable
              style={[styles.tabBtn, authMode === 'signin' && styles.tabBtnActive]}
              scaleTo={0.96}
              onPress={() => setAuthMode('signin')}
            >
              <Text style={[styles.tabBtnText, authMode === 'signin' && styles.tabBtnTextActive]}>
                Sign In
              </Text>
            </TactilePressable>
          </View>

          {authMode === 'signin' ? (
            /* SIGN IN FORM */
            <View>
              <Text style={styles.cardHeaderTitle}>Welcome Back</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Enter your registered phone number to access your committees.
              </Text>

              {/* Phone Number */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>PHONE NUMBER</Text>
                <View style={styles.inputWithIcon}>
                  <Phone size={16} color="#71717A" strokeWidth={2} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    value={signInPhone}
                    onChangeText={setSignInPhone}
                    placeholder="0300 1234567"
                    placeholderTextColor="#A1A1AA"
                    keyboardType="phone-pad"
                    maxLength={13}
                    autoFocus
                  />
                </View>
              </View>

              {/* Sign In Button */}
              <TactilePressable
                style={styles.startBtn}
                haptic="success"
                scaleTo={0.97}
                onPress={handleSignIn}
              >
                <Text style={styles.startBtnText}>Sign In</Text>
                <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />
              </TactilePressable>

              {/* Switch to Sign Up */}
              <TactilePressable
                style={styles.switchModeLink}
                scaleTo={0.97}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={styles.switchModeText}>
                  Don't have an account? <Text style={{ fontWeight: '800', color: '#000000' }}>Create Profile</Text>
                </Text>
              </TactilePressable>
            </View>
          ) : (
            /* SIGN UP / CREATE PROFILE FORM */
            <View>
              <Text style={styles.cardHeaderTitle}>Create Profile</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Enter your details to track payments and join committees.
              </Text>

              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>FULL NAME</Text>
                <View style={styles.inputWithIcon}>
                  <User size={16} color="#71717A" strokeWidth={2} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Aown Raza"
                    placeholderTextColor="#A1A1AA"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Phone Number */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>PHONE NUMBER</Text>
                <View style={styles.inputWithIcon}>
                  <Phone size={16} color="#71717A" strokeWidth={2} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="0300 1234567"
                    placeholderTextColor="#A1A1AA"
                    keyboardType="phone-pad"
                    maxLength={13}
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

              {/* Payment Account Number */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>PAYMENT ACCOUNT NUMBER (OPTIONAL)</Text>
                <View style={styles.inputWithIcon}>
                  <CreditCard size={16} color="#71717A" strokeWidth={2} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Account / Wallet number"
                    placeholderTextColor="#A1A1AA"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Get Started Button */}
              <TactilePressable
                style={styles.startBtn}
                haptic="success"
                scaleTo={0.97}
                onPress={handleStart}
              >
                <Text style={styles.startBtnText}>Get Started</Text>
                <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />
              </TactilePressable>

              {/* Quick Demo Fill Button */}
              <TactilePressable
                style={styles.demoFillBtn}
                haptic="selection"
                scaleTo={0.97}
                onPress={handleQuickDemoFill}
              >
                <Zap size={14} color="#71717A" strokeWidth={2} style={{ marginRight: 6 }} />
                <Text style={styles.demoFillBtnText}>Quick Fill Demo Profile</Text>
              </TactilePressable>

              {/* Switch to Sign In */}
              <TactilePressable
                style={styles.switchModeLink}
                scaleTo={0.97}
                onPress={() => setAuthMode('signin')}
              >
                <Text style={styles.switchModeText}>
                  Already have an account? <Text style={{ fontWeight: '800', color: '#000000' }}>Sign In</Text>
                </Text>
              </TactilePressable>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  formCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 13,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.7,
    marginBottom: 6,
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
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentPillActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  paymentPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#52525B',
  },
  paymentPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: '#000000',
    borderRadius: 9999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E4E4E7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
  },
  tabBtnTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  switchModeLink: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  switchModeText: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
  },
  demoFillBtn: {
    backgroundColor: '#E4E4E7',
    borderRadius: 9999,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  demoFillBtnText: {
    color: '#52525B',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
