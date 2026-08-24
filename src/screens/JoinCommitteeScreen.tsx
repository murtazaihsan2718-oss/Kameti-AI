import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { ArrowLeft, ArrowRight, Users, Wallet, Calendar } from 'lucide-react-native';
import { Committee, Member } from '../types/dataTypes';
import { nativeStorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';
import { TactilePressable } from '../components/TactilePressable';

interface JoinCommitteeScreenProps {
  initialCode?: string;
  onBack: () => void;
  onJoined: (committeeId: string) => void;
}

export const JoinCommitteeScreen: React.FC<JoinCommitteeScreenProps> = ({
  initialCode = '',
  onBack,
  onJoined,
}) => {
  const [code, setCode] = useState(initialCode);
  const [previewCommittee, setPreviewCommittee] = useState<Committee | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCode) {
      searchCode(initialCode);
    }
  }, [initialCode]);

  const searchCode = async (searchCodeVal: string) => {
    const cleanCode = searchCodeVal.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    const localList = await nativeStorageService.getCommittees();
    let match = localList.find(c => c.joinCode === cleanCode);

    if (!match) {
      const cloudMatch = await FirebaseService.getCommitteeByCode(cleanCode);
      if (cloudMatch) {
        match = cloudMatch;
      }
    }

    setLoading(false);
    if (match) {
      setPreviewCommittee(match);
    } else {
      setPreviewCommittee(null);
      Alert.alert('Not Found', `No committee found with code "${cleanCode}".`);
    }
  };

  const handleJoin = async () => {
    if (!previewCommittee) {
      await searchCode(code);
      return;
    }

    const user = await nativeStorageService.getUser();
    const newMember: Member = {
      id: user.id,
      name: `${user.name} (You)`,
      phone: user.phone,
      avatar: 'user',
      paymentMethod: user.paymentMethod,
      accountNumber: user.accountNumber,
      accountTitle: user.accountTitle,
      hasReceivedPayout: false,
    };

    await FirebaseService.joinCommittee(previewCommittee.id, newMember);

    const localList = await nativeStorageService.getCommittees();
    const exists = localList.some(c => c.id === previewCommittee.id);
    if (!exists) {
      const updatedCommittee = {
        ...previewCommittee,
        members: [...(previewCommittee.members || []), newMember],
      };
      await nativeStorageService.saveCommittees([updatedCommittee, ...localList]);
    }

    Alert.alert('Joined!', `Successfully joined "${previewCommittee.name}"!`);
    onJoined(previewCommittee.id);
  };

  let poolAmount = 0;
  let totalSlots = 5;
  let memberCount = 1;

  if (previewCommittee) {
    if (previewCommittee.totalPool) {
      poolAmount = previewCommittee.totalPool;
    } else if (previewCommittee.contributionAmount) {
      const count = previewCommittee.memberCount || previewCommittee.totalCycles || 5;
      poolAmount = count * previewCommittee.contributionAmount;
    }

    if (previewCommittee.memberCount) {
      totalSlots = previewCommittee.memberCount;
    } else if (previewCommittee.totalCycles) {
      totalSlots = previewCommittee.totalCycles;
    }

    if (previewCommittee.members) {
      memberCount = previewCommittee.members.length;
    }
  }

  let pageTitle = 'Enter Join Code';
  let pageSubtitle = 'Enter the 6-character code shared by your committee creator.';

  if (previewCommittee) {
    pageTitle = previewCommittee.name;
    pageSubtitle = "You've been invited to join this committee";
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Header Bar with Back Arrow < */}
        <View style={styles.header}>
          <TactilePressable
            style={styles.headerBtn}
            scaleTo={0.9}
            onPress={() => {
              onBack();
            }}
          >
            <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
          </TactilePressable>
          <Text style={styles.headerTitle}>Kameti AI</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{pageTitle}</Text>
          <Text style={styles.pageSubtitle}>{pageSubtitle}</Text>
        </View>

        {previewCommittee ? (
          /* Directly Show Preview Card When Link Code is Provided */
          <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewIconCircle}>
                <Users size={18} color="#000000" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewCommitteeName}>{previewCommittee.name}</Text>
                <Text style={styles.previewSlotsText}>{memberCount} / {totalSlots} Members Joined</Text>
              </View>
            </View>

            {/* Monthly Contribution Highlight */}
            <View style={styles.contributionBox}>
              <Text style={styles.contribLabel}>MONTHLY CONTRIBUTION</Text>
              <Text style={styles.contribValue}>
                PKR {previewCommittee.contributionAmount.toLocaleString()}
              </Text>
            </View>

            {/* Details Row: Pool & Duration */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <View style={styles.detailIconRow}>
                  <Wallet size={14} color="#71717A" strokeWidth={2} />
                  <Text style={styles.detailLabel}>TOTAL POOL</Text>
                </View>
                <Text style={styles.detailValue}>PKR {poolAmount.toLocaleString()}</Text>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailIconRow}>
                  <Calendar size={14} color="#71717A" strokeWidth={2} />
                  <Text style={styles.detailLabel}>DURATION</Text>
                </View>
                <Text style={styles.detailValue}>{totalSlots} Months</Text>
              </View>
            </View>

            <TactilePressable
              containerStyle={{ width: '100%' }}
              style={styles.joinBtn}
              scaleTo={0.97}
              onPress={handleJoin}
            >
              <Text style={styles.joinBtnText}>Join Committee</Text>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
            </TactilePressable>
          </View>
        ) : (
          /* Manual Code Input Form Card (Only shown if user opens Join without a link) */
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>INVITATION CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. FRIEND5"
                placeholderTextColor="#A1A1AA"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
            </View>

            <TactilePressable
              containerStyle={{ width: '100%' }}
              style={styles.actionBtn}
              scaleTo={0.97}
              onPress={() => {
                searchCode(code);
              }}
            >
              <Text style={styles.actionBtnText}>{loading ? 'Searching...' : 'Find Committee'}</Text>
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
  previewCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
    padding: 18,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  previewIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCommitteeName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  previewSlotsText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '600',
    marginTop: 1,
  },
  contributionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  contribLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  contribValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#000000',
  },
  joinBtn: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 9999,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
    padding: 18,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 2,
  },
  actionBtn: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 9999,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
