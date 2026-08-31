import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Menu, User, Plus, Users } from 'lucide-react-native';
import { Committee, CommitteeStatus, SelectionMode, UserProfile, Member } from '../types/dataTypes';
import { nativeStorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';
import { TactilePressable } from '../components/TactilePressable';

interface HomeScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  onOpenVoice: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, onOpenVoice }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [committees, setCommittees] = useState<Committee[]>([]);

  useEffect(() => {
    loadData();
    const unsubscribe = nativeStorageService.subscribe(loadData);
    
    // Cloud Firestore live listener
    const unsubCloud = FirebaseService.subscribeCommittees(async (cloudList) => {
      if (cloudList) {
        if (cloudList.length > 0) {
          const local = await nativeStorageService.getCommittees();
          cloudList.forEach(cc => {
            const matchIdx = local.findIndex(lc => {
              if (lc.id === cc.id) {
                return true;
              }
              if (lc.joinCode && cc.joinCode && lc.joinCode.toUpperCase() === cc.joinCode.toUpperCase()) {
                return true;
              }
              return false;
            });

            let membersList: Member[] = [];
            if (cc.members) {
              membersList = cc.members;
            }

            if (matchIdx >= 0) {
              local[matchIdx] = {
                ...local[matchIdx],
                ...cc,
                members: membersList,
                memberCount: membersList.length > 0 ? membersList.length : local[matchIdx].memberCount,
              };
            } else {
              let memberCountVal = 5;
              if (cc.memberCount) {
                memberCountVal = cc.memberCount;
              } else if (cc.numberOfMembers) {
                memberCountVal = cc.numberOfMembers;
              }

              let startVal = new Date().toISOString().split('T')[0];
              if (cc.startDate) {
                startVal = cc.startDate;
              }

              let totalCyclesVal = 5;
              if (cc.totalCycles) {
                totalCyclesVal = cc.totalCycles;
              }

              let recipientVal = '';
              if (cc.currentRecipientId) {
                recipientVal = cc.currentRecipientId;
              }

              let freqVal: 'monthly' | 'custom' = 'monthly';
              if (cc.frequency === 'custom') {
                freqVal = 'custom';
              }

              let currentCycleVal = 1;
              if (cc.currentCycle) {
                currentCycleVal = cc.currentCycle;
              }

              let statusVal: CommitteeStatus = 'active';
              if (cc.status) {
                statusVal = cc.status;
              }

              let selectModeVal: SelectionMode = 'random';
              if (cc.selectionMode) {
                selectModeVal = cc.selectionMode;
              }

              local.unshift({
                id: cc.id,
                name: cc.name,
                joinCode: cc.joinCode,
                contributionAmount: cc.contributionAmount,
                memberCount: memberCountVal,
                totalPool: memberCountVal * cc.contributionAmount,
                startDate: startVal,
                totalCycles: totalCyclesVal,
                currentRecipientId: recipientVal,
                duration: totalCyclesVal,
                frequency: freqVal,
                currentCycle: currentCycleVal,
                status: statusVal,
                selectionMode: selectModeVal,
                members: membersList,
                payments: [],
              });
            }
          });
          await nativeStorageService.saveCommittees(local);
          setCommittees(local);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubCloud) {
        unsubCloud();
      }
    };
  }, []);

  const loadData = async () => {
    const userData = await nativeStorageService.getUser();
    let committeeData = await nativeStorageService.getCommittees();
    setUser(userData);

    const isDemoUser = userData?.id === 'usr_aown' || (userData?.name || '').toLowerCase().includes('aown');

    if (committeeData.length === 0 && isDemoUser) {
      committeeData = [
        {
          id: 'c_family',
          name: 'Family Savings',
          joinCode: 'FAM01',
          contributionAmount: 5000,
          memberCount: 12,
          totalPool: 60000,
          startDate: '2026-08-01',
          totalCycles: 12,
          currentRecipientId: 'm1',
          duration: 12,
          frequency: 'monthly',
          currentCycle: 3,
          status: 'active',
          selectionMode: 'random',
          members: [],
          payments: [],
        },
        {
          id: 'c_office',
          name: 'Office Group',
          joinCode: 'OFF02',
          contributionAmount: 2500,
          memberCount: 10,
          totalPool: 25000,
          startDate: '2026-08-01',
          totalCycles: 10,
          currentRecipientId: 'm2',
          duration: 10,
          frequency: 'monthly',
          currentCycle: 7,
          status: 'active',
          selectionMode: 'random',
          members: [],
          payments: [],
        },
        {
          id: 'c_travel',
          name: 'Travel Fund',
          joinCode: 'TRV03',
          contributionAmount: 5000,
          memberCount: 6,
          totalPool: 30000,
          startDate: '2026-08-01',
          totalCycles: 6,
          currentRecipientId: 'm3',
          duration: 6,
          frequency: 'monthly',
          currentCycle: 1,
          status: 'active',
          selectionMode: 'random',
          members: [],
          payments: [],
        },
      ];
      await nativeStorageService.saveCommittees(committeeData);
    }

    setCommittees(committeeData);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header - Clean Centered Title with Profile Icon on Right */}
        <View style={styles.header}>
          <View style={styles.headerBtn} />
          <Text style={styles.headerTitle}>Kameti AI</Text>
          <TactilePressable
            style={styles.headerBtn}
            haptic="selection"
            scaleTo={0.9}
            onPress={() => {
              onNavigate('profile');
            }}
          >
            <User size={22} color="#000000" strokeWidth={2} />
          </TactilePressable>
        </View>

        {/* Hero Card: + Create New Committee */}
        <TactilePressable
          style={styles.createCard}
          haptic="medium"
          scaleTo={0.97}
          onPress={() => {
            onNavigate('create');
          }}
        >
          <View style={styles.plusCircle}>
            <Plus size={18} color="#FFFFFF" strokeWidth={2.8} />
          </View>
          <Text style={styles.createText}>Create New Committee</Text>
        </TactilePressable>

        {/* Section Header: Active Committees */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Committees</Text>
        </View>

        {/* Committee Cards List or Empty State */}
        {committees.length === 0 ? (
          <View style={{ backgroundColor: '#F4F4F5', borderRadius: 20, padding: 32, alignItems: 'center', marginTop: 4 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#E4E4E7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Users size={22} color="#71717A" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#000000', marginBottom: 6 }}>No Committees Yet</Text>
            <Text style={{ fontSize: 13, color: '#71717A', fontWeight: '500', lineHeight: 18, textAlign: 'center', maxWidth: 280 }}>
              Tap <Text style={{ fontWeight: '700', color: '#000' }}>"Create New Committee"</Text> above to start your first savings circle, or join with an invite code.
            </Text>
          </View>
        ) : (
          committees.map((committee) => {
            let currentCycle = committee.currentCycle || 1;
            let totalCycles = committee.totalCycles || committee.memberCount || 5;

            return (
              <TactilePressable
                key={committee.id}
                style={styles.committeeCard}
                haptic="selection"
                scaleTo={0.97}
                onPress={() => {
                  onNavigate('room', { committeeId: committee.id });
                }}
              >
              {/* Top Row: Group Icon + Title + Cycle Badge */}
              <View style={styles.cardTopRow}>
                <View style={styles.titleWithIcon}>
                  <View style={styles.categoryIconCircle}>
                    <Users size={16} color="#000000" strokeWidth={2} />
                  </View>
                  <Text style={styles.committeeName} numberOfLines={1}>
                    {committee.name}
                  </Text>
                </View>

                <View style={styles.cycleBadge}>
                  <Text style={styles.cycleBadgeText}>
                    Cycle {currentCycle} of {totalCycles}
                  </Text>
                </View>
              </View>

              {/* Bottom Row: Monthly Contribution */}
              <View style={styles.contributionSection}>
                <Text style={styles.contributionLabel}>Monthly Contribution</Text>
                <Text style={styles.contributionValue}>
                  PKR {committee.contributionAmount.toLocaleString()}
                </Text>
              </View>
            </TactilePressable>
          );
        }))}
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
  createCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#D4D4D8',
    borderStyle: 'dashed',
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
  },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  createText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#000000',
  },
  sectionHeader: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.1,
  },
  committeeCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  titleWithIcon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  committeeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  cycleBadge: {
    flexShrink: 0,
    backgroundColor: '#E4E4E7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 9999,
  },
  cycleBadgeText: {
    color: '#3F3F46',
    fontSize: 10.5,
    fontWeight: '600',
  },
  contributionSection: {
    marginTop: 0,
  },
  contributionLabel: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '500',
    marginBottom: 2,
  },
  contributionValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
});
