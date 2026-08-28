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

const PAYMENT_OPTIONS: { label: string; value: PaymentMethod }[] = [
  { label: 'EasyPaisa', value: 'easypaisa' },
  { label: 'JazzCash', value: 'jazzcash' },
  { label: 'SadaPay', value: 'sadapay' },
  { label: 'Bank / Raast', value: 'raast' },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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

    const cleanPhone = phone.trim();
    const newUser: UserProfile = {
      id: 'u_' + Date.now().toString(36),
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

  const handleQuickDemoFill = () => {
    setName('Aown Raza');
    setPhone('+92 300 1234567');
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

        {/* Profile Creation Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeaderTitle}>Sign In / Create Profile</Text>
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
