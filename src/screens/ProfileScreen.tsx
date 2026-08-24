import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { ArrowLeft, User, Phone, CreditCard, Save } from 'lucide-react-native';
import { UserProfile, PaymentMethod } from '../types/dataTypes';
import { nativeStorageService } from '../services/storageService';
import { TactilePressable } from '../components/TactilePressable';

interface ProfileScreenProps {
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('easypaisa');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const data = await nativeStorageService.getUser();
    setUser(data);
    if (data.name) {
      setName(data.name);
    }
    if (data.phone) {
      setPhone(data.phone);
    }
    if (data.paymentMethod) {
      setPaymentMethod(data.paymentMethod);
    }
    if (data.accountNumber) {
      setAccountNumber(data.accountNumber);
    }
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }
    await nativeStorageService.updateUser({
      name,
      phone,
      paymentMethod,
      accountNumber,
    });
    Alert.alert('Profile Saved', 'Your payment account details were updated.');
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

          <TactilePressable
            style={styles.saveBtn}
            haptic="success"
            scaleTo={0.97}
            onPress={handleSave}
          >
            <Save size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Save Details</Text>
          </TactilePressable>
        </View>

      </ScrollView>
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
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
