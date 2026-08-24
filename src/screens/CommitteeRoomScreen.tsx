import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert, Animated } from 'react-native';
import { ArrowLeft, User, ArrowRight, X, CreditCard, Check, Trash2, Copy, Users, Send } from 'lucide-react-native';
import { Committee, Member } from '../types/dataTypes';
import { nativeStorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';
import { LinkingService } from '../services/linkingService';
import { CircleCommittee } from '../components/CircleCommittee';
import { PaymentProofModal } from '../components/PaymentProofModal';
import { TactilePressable } from '../components/TactilePressable';

interface CommitteeRoomScreenProps {
  committeeId: string;
  onBack: () => void;
  onOpenProfile?: () => void;
}

export const CommitteeRoomScreen: React.FC<CommitteeRoomScreenProps> = ({
  committeeId,
  onBack,
  onOpenProfile,
}) => {
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);

  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedMember) {
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
  }, [selectedMember]);

  const closeModal = () => {
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
      setSelectedMember(null);
    });
  };

  useEffect(() => {
    loadCommittee();
    const unsub = nativeStorageService.subscribe(loadCommittee);
    return unsub;
  }, [committeeId]);

  const loadCommittee = async () => {
    const list = await nativeStorageService.getCommittees();
    let found = list.find(c => c.id === committeeId);
    if (!found) {
      if (list.length > 0) {
        found = list[0];
      }
    }
    if (found) {
      setCommittee(found);
    } else {
      setCommittee(null);
    }
  };

  let recipient: Member = {
    id: 'm1',
    name: 'Sarah Ahmed',
    phone: '0300 1234567',
    avatar: 'user',
    paymentMethod: 'EasyPaisa',
    accountNumber: '0300 1234567',
    accountTitle: 'Sarah',
    hasReceivedPayout: false,
  };

  if (committee) {
    if (committee.members) {
      if (committee.members.length > 0) {
        const foundRecipient = committee.members.find(m => m.id === committee.currentRecipientId);
        if (foundRecipient) {
          recipient = foundRecipient;
        } else {
          recipient = committee.members[0];
        }
      }
    }
  }

  let currentCycle = 1;
  if (committee) {
    if (committee.currentCycle) {
      currentCycle = committee.currentCycle;
    }
  }

  let totalCycles = 5;
  if (committee) {
    if (committee.duration) {
      totalCycles = committee.duration;
    } else if (committee.totalCycles) {
      totalCycles = committee.totalCycles;
    } else if (committee.memberCount) {
      totalCycles = committee.memberCount;
    }
  }

  let memberCount = 0;
  if (committee) {
    if (committee.members) {
      memberCount = committee.members.length;
    }
  }

  let isFull = false;
  if (memberCount >= totalCycles) {
    isFull = true;
  }

  // Allow deleting all committees that are not full for testing
  let canDelete = false;
  if (!isFull) {
    canDelete = true;
  }

  let memberModalVisible = false;
  if (selectedMember) {
    memberModalVisible = true;
  }

  let memberNameDisplay = 'Sarah Ahmed';
  let memberPhoneDisplay = '03XX XXXXXXX';
  let memberPayoutDisplay = 'EasyPaisa';

  if (selectedMember) {
    if (selectedMember.name) {
      memberNameDisplay = selectedMember.name;
    }
    if (selectedMember.phone) {
      memberPhoneDisplay = selectedMember.phone;
    }
    if (selectedMember.paymentMethod) {
      memberPayoutDisplay = selectedMember.paymentMethod;
    }
  }

  let joinLink = '';
  if (committee) {
    joinLink = `kameti-ai.web.app/join?code=${committee.joinCode}`;
  }

  let payoutAmountDisplay = '500.00';
  if (committee) {
    if (committee.contributionAmount) {
      payoutAmountDisplay = committee.contributionAmount.toLocaleString();
    }
  }

  const handleDeleteCommittee = () => {
    if (!committee) {
      return;
    }

    Alert.alert(
      'Delete Committee',
      `Are you sure you want to delete "${committee.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await nativeStorageService.deleteCommittee(committee.id);
            await FirebaseService.deleteCommittee(committee.id);
            Alert.alert('Deleted', `"${committee.name}" has been deleted.`);
            onBack();
          },
        },
      ]
    );
  };

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

        {/* TOP SPOTLIGHT CARD - Swaps between "Invite Members" (if waiting) and "NEXT PAYOUT" (if full) */}
        {!isFull && committee && (
          <View style={styles.spotlightCard}>
            <View style={styles.waitingHeaderRow}>
              <View style={styles.waitingHeaderLeft}>
                <Text style={styles.spotlightSubtitle}>WAITING FOR MEMBERS</Text>
                <View style={styles.slotsBadge}>
                  <Text style={styles.slotsBadgeText}>{memberCount} / {totalCycles} Joined</Text>
                </View>
              </View>

              {/* Small subtle delete trash icon on the invite card */}
              {canDelete && (
                <TactilePressable
                  style={styles.cardDeleteBtn}
                  haptic="medium"
                  scaleTo={0.88}
                  onPress={handleDeleteCommittee}
                >
                  <Trash2 size={16} color="#71717A" strokeWidth={2} />
                </TactilePressable>
              )}
            </View>

            <Text style={styles.inviteCardTitle}>Invite Members</Text>

            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1}>{joinLink}</Text>
              <TactilePressable
                style={styles.copyBtn}
                haptic="light"
                scaleTo={0.88}
                onPress={() => {
                  Alert.alert('Copied!', `Join link for "${committee.name}" copied to clipboard.`);
                }}
              >
                <Copy size={14} color="#000000" strokeWidth={2} />
              </TactilePressable>
            </View>

            <TactilePressable
              containerStyle={{ width: '100%' }}
              style={styles.submitProofBtn}
              scaleTo={0.97}
              onPress={async () => {
                await LinkingService.shareCommitteeLink(committee.name, committee.joinCode, committee.totalPool);
              }}
            >
              <View style={styles.btnRow}>
                <Send size={15} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 8 }} />
                <Text style={styles.submitProofText}>Share Invite Link</Text>
              </View>
            </TactilePressable>
          </View>
        )}

        {isFull && committee && (
          <View style={styles.spotlightCard}>
            <Text style={styles.spotlightSubtitle}>NEXT PAYOUT</Text>
            <Text style={styles.recipientName}>{recipient.name}</Text>
            <Text style={styles.payoutAmount}>PKR {payoutAmountDisplay}</Text>

            <TactilePressable
              containerStyle={{ width: '100%' }}
              style={styles.submitProofBtn}
              scaleTo={0.97}
              onPress={() => {
                setShowProofModal(true);
              }}
            >
              <View style={styles.btnRow}>
                <Text style={styles.submitProofText}>Submit payment proof</Text>
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 8 }} />
              </View>
            </TactilePressable>
          </View>
        )}

        {/* Circular Wheel Section */}
        <View style={styles.wheelSection}>
          {isFull ? (
            <Text style={styles.cycleText}>CYCLE {currentCycle} OF {totalCycles}</Text>
          ) : (
            <Text style={styles.cycleText}>COMMITTEE FORMING</Text>
          )}

          {isFull ? (
            <Text style={styles.paidCountText}>{memberCount} members in circle</Text>
          ) : (
            <Text style={styles.paidCountText}>{memberCount} of {totalCycles} slots filled</Text>
          )}

          <Text style={styles.downArrow}>▼</Text>

          {committee && (
            <CircleCommittee
              committee={committee}
              onMemberPress={(m) => {
                setSelectedMember(m);
              }}
              onSpinPress={() => {}}
            />
          )}
        </View>

      </ScrollView>

      {/* Member Details Popup Modal with Fast Tactile Spring Pop Animation */}
      <Modal
        visible={memberModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            <TactilePressable
              style={styles.modalCloseBtn}
              scaleTo={0.88}
              onPress={closeModal}
            >
              <X size={15} color="#000000" strokeWidth={2.5} />
            </TactilePressable>

            <View style={styles.avatarCircleLarge}>
              <User size={26} color="#71717A" strokeWidth={2} />
            </View>

            <Text style={styles.modalMemberName}>{memberNameDisplay}</Text>
            <Text style={styles.modalMemberPhone}>{memberPhoneDisplay}</Text>

            {/* Info Cards */}
            <View style={styles.modalInfoCards}>
              <View style={styles.modalInfoRow}>
                <View style={styles.infoRowLeft}>
                  <CreditCard size={16} color="#000000" strokeWidth={2} />
                  <Text style={styles.infoRowLabel}>PREFERRED PAYOUT</Text>
                </View>
                <Text style={styles.infoRowValue}>{memberPayoutDisplay}</Text>
              </View>

              <View style={styles.modalInfoRow}>
                <View style={styles.infoRowLeft}>
                  <Check size={16} color="#000000" strokeWidth={2.5} />
                  <Text style={styles.infoRowLabel}>STATUS</Text>
                </View>
                <Text style={styles.infoRowValue}>{isFull ? 'Active' : 'Joined'}</Text>
              </View>
            </View>

            <TactilePressable
              style={styles.modalClosePill}
              scaleTo={0.96}
              onPress={closeModal}
            >
              <Text style={styles.modalClosePillText}>Close</Text>
            </TactilePressable>

          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Payment Proof Modal (Enabled when committee is full) */}
      {isFull && committee && (
        <PaymentProofModal
          visible={showProofModal}
          onClose={() => {
            setShowProofModal(false);
          }}
          committee={committee}
          recipient={recipient}
        />
      )}
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
  spotlightCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  waitingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  waitingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.8,
  },
  slotsBadge: {
    backgroundColor: '#E4E4E7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 9999,
  },
  slotsBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#3F3F46',
  },
  inviteCardTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
    marginTop: 2,
    marginBottom: 12,
  },
  recipientName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
    marginTop: 4,
    marginBottom: 4,
  },
  linkRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    color: '#52525B',
    fontWeight: '500',
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  payoutAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  submitProofBtn: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 9999,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  submitProofText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  cycleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  paidCountText: {
    fontSize: 12,
    color: '#52525B',
    fontWeight: '600',
  },
  downArrow: {
    fontSize: 12,
    color: '#000000',
    marginTop: 6,
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleLarge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  modalMemberName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  modalMemberPhone: {
    fontSize: 12.5,
    color: '#71717A',
    fontWeight: '500',
    marginBottom: 16,
  },
  modalInfoCards: {
    width: '100%',
    gap: 8,
    marginBottom: 18,
  },
  modalInfoRow: {
    backgroundColor: '#F4F4F5',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoRowLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.7,
  },
  infoRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  modalClosePill: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 9999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClosePillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
