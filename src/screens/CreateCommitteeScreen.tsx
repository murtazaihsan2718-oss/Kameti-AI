import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { ArrowLeft, User, ArrowRight, Minus, Plus, Wallet, Copy, Users, Send } from 'lucide-react-native';
import { SelectionMode, Committee } from '../types/dataTypes';
import { nativeStorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';
import { LinkingService } from '../services/linkingService';
import { TactilePressable } from '../components/TactilePressable';

interface CreateCommitteeScreenProps {
  onBack: () => void;
  onCreated: (committeeId: string) => void;
  onOpenProfile?: () => void;
}

export const CreateCommitteeScreen: React.FC<CreateCommitteeScreenProps> = ({ onBack, onCreated, onOpenProfile }) => {
  const [name, setName] = useState('Summer Vacation Fund');
  const [memberCount, setMemberCount] = useState(4);
  const [contribution, setContribution] = useState('250');
  const [duration, setDuration] = useState('12');
  const [deadline, setDeadline] = useState('10th');
  const [createdCommittee, setCreatedCommittee] = useState<Committee | null>(null);

  let contribNum = 0;
  if (contribution) {
    const parsed = parseInt(contribution, 10);
    if (!isNaN(parsed)) {
      contribNum = parsed;
    }
  }

  const totalPool = memberCount * contribNum;

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a committee name.');
      return;
    }

    const joinCode = 'KMT' + Math.floor(1000 + Math.random() * 9000);
    const newId = 'c_' + Date.now();
    const user = await nativeStorageService.getUser();

    const newCommittee: Committee = {
      id: newId,
      name: name.trim(),
      joinCode,
      memberCount,
      contributionAmount: contribNum,
      totalPool,
      frequency: 'monthly',
      selectionMode: 'random',
      startDate: new Date().toISOString().split('T')[0],
      currentCycle: 1,
      totalCycles: memberCount,
      currentRecipientId: user.id,
      status: 'active',
      nextDueDate: '2026-09-01',
      members: [
        {
          id: user.id,
          name: `${user.name} (You)`,
          phone: user.phone,
          avatar: 'user',
          paymentMethod: user.paymentMethod,
          accountNumber: user.accountNumber,
          accountTitle: user.accountTitle,
          hasReceivedPayout: false,
        },
      ],
      payments: [],
      history: [],
    };

    try {
      const currentCommittees = await nativeStorageService.getCommittees();
      await nativeStorageService.saveCommittees([newCommittee, ...currentCommittees]);
      FirebaseService.saveCommittee(newCommittee).catch(() => {});
      setCreatedCommittee(newCommittee);
    } catch (err: any) {
      let errMsg = 'Could not create committee.';
      if (err) {
        if (err.message) {
          errMsg = err.message;
        }
      }
      Alert.alert('Error', errMsg);
    }
  };

  let inviteLink = '';
  if (createdCommittee) {
    inviteLink = `kameti-ai.web.app/join?code=${createdCommittee.joinCode}`;
  }

  let pageTitleText = 'Committee Settings';
  let pageSubtitleText = 'Configure the settings for your new savings pool.';

  if (createdCommittee) {
    pageTitleText = 'Committee Created!';
    pageSubtitleText = 'Share this secure link with your friends to allow them to join.';
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Header Bar with Back Arrow < */}
        <View style={styles.header}>
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
          <Text style={styles.headerTitle}>Kameti AI</Text>
          <TactilePressable
            style={styles.headerBtn}
            haptic="selection"
            scaleTo={0.9}
            onPress={() => {
              if (onOpenProfile) {
                onOpenProfile();
              }
            }}
          >
            <User size={20} color="#000000" strokeWidth={2} />
          </TactilePressable>
        </View>

        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{pageTitleText}</Text>
          <Text style={styles.pageSubtitle}>{pageSubtitleText}</Text>
        </View>

        {createdCommittee ? (
          /* Invite Card */
          <View style={styles.formCard}>
            <View style={styles.inviteHeader}>
              <View style={styles.inviteIconCircle}>
                <Users size={18} color="#000000" strokeWidth={2} />
              </View>
              <Text style={styles.inviteTitle}>Invite Members</Text>
            </View>

            <Text style={styles.inviteDescription}>
              Share this secure link with your friends to allow them to join the committee.
            </Text>

            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
              <TactilePressable
                style={styles.copyBtn}
                haptic="light"
                scaleTo={0.88}
                onPress={() => {
                  Alert.alert('Copied!', 'Invite link copied to clipboard.');
                }}
              >
                <Copy size={15} color="#000000" strokeWidth={2} />
              </TactilePressable>
            </View>

            <TactilePressable
              style={styles.createBtn}
              haptic="medium"
              scaleTo={0.97}
              onPress={async () => {
                await LinkingService.shareCommitteeLink(createdCommittee.name, createdCommittee.joinCode, createdCommittee.totalPool);
                onCreated(createdCommittee.id);
              }}
            >
              <Send size={16} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 6 }} />
              <Text style={styles.createBtnText}>Invite Friends</Text>
            </TactilePressable>
          </View>
        ) : (
          /* Form Card */
          <View style={styles.formCard}>
            
            {/* COMMITTEE NAME */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>COMMITTEE NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Summer Vacation Fund"
                placeholderTextColor="#A1A1AA"
              />
            </View>

            {/* NUMBER OF PARTICIPANTS (- 4 +) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>NUMBER OF PARTICIPANTS</Text>
              <View style={styles.stepperContainer}>
                <TactilePressable
                  style={styles.stepperBtn}
                  haptic="selection"
                  scaleTo={0.88}
                  onPress={() => {
                    if (memberCount > 2) {
                      setMemberCount(memberCount - 1);
                    }
                  }}
                >
                  <Minus size={16} color="#000000" strokeWidth={2.5} />
                </TactilePressable>
                <Text style={styles.stepperVal}>{memberCount}</Text>
                <TactilePressable
                  style={[styles.stepperBtn, styles.stepperBtnPlus]}
                  haptic="selection"
                  scaleTo={0.88}
                  onPress={() => {
                    if (memberCount < 50) {
                      setMemberCount(memberCount + 1);
                    }
                  }}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                </TactilePressable>
              </View>
            </View>

            {/* MONTHLY CONTRIBUTION */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>MONTHLY CONTRIBUTION</Text>
              <View style={styles.contribInputBox}>
                <Text style={styles.contribPrefix}>PKR</Text>
                <TextInput
                  style={styles.contribInput}
                  value={contribution}
                  onChangeText={setContribution}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* MONTHLY POOL SUB-CARD */}
            <View style={styles.monthlyPoolCard}>
              <View>
                <Text style={styles.poolCardLabel}>MONTHLY POOL</Text>
                <Text style={styles.poolCardValue}>PKR {totalPool.toLocaleString()}</Text>
              </View>
              <View style={styles.poolWalletIcon}>
                <Wallet size={16} color="#000000" strokeWidth={2} />
              </View>
            </View>

            {/* DURATION (MONTHS) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>DURATION (MONTHS)</Text>
              <View style={styles.dropdownBox}>
                <Text style={styles.dropdownText}>12 Months</Text>
                <Text style={styles.dropdownArrow}>⌄</Text>
              </View>
            </View>

            {/* MONTHLY DEPOSIT DEADLINE */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>MONTHLY DEPOSIT DEADLINE</Text>
              <View style={styles.dropdownBox}>
                <Text style={styles.dropdownText}>10th</Text>
                <Text style={styles.dropdownArrow}>⌄</Text>
              </View>
            </View>

            <TactilePressable
              style={styles.createBtn}
              haptic="success"
              scaleTo={0.97}
              onPress={handleCreate}
            >
              <Text style={styles.createBtnText}>Create Committee</Text>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
            </TactilePressable>

          </View>
        )}

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
    letterSpacing: -0.2,
  },
  titleSection: {
    marginTop: 2,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 12.5,
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
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPlus: {
    backgroundColor: '#000000',
  },
  stepperVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  contribInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 6,
  },
  contribPrefix: {
    fontSize: 20,
    fontWeight: '800',
    color: '#A1A1AA',
  },
  contribInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  monthlyPoolCard: {
    backgroundColor: '#E4E4E7',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  poolCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  poolCardValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
  },
  poolWalletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#71717A',
  },
  createBtn: {
    backgroundColor: '#000000',
    borderRadius: 9999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  inviteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  inviteDescription: {
    fontSize: 12.5,
    color: '#71717A',
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 14,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  linkText: {
    flex: 1,
    fontSize: 12.5,
    color: '#52525B',
    fontWeight: '500',
  },
  copyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
