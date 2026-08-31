import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert, Animated, Image, Pressable } from 'react-native';
import { ArrowLeft, User, ArrowRight, X, CreditCard, Check, Trash2, Copy, Users, Send, FileText, ZoomIn, CheckCheck, Sparkles } from 'lucide-react-native';
import { Committee, Member, UserProfile } from '../types/dataTypes';
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [hasViewedProof, setHasViewedProof] = useState(false);
  const [shouldAnimateSpin, setShouldAnimateSpin] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const deleteModalScale = useRef(new Animated.Value(0.82)).current;
  const deleteModalOpacity = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    nativeStorageService.getUser().then(u => {
      if (u) {
        setCurrentUser(u);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedMember) {
      setHasViewedProof(false);
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

  useEffect(() => {
    if (showDeleteConfirm) {
      deleteModalScale.setValue(0.82);
      deleteModalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(deleteModalScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 38,
          bounciness: 7,
        }),
        Animated.timing(deleteModalOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showDeleteConfirm]);

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

  const closeDeleteModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(deleteModalScale, {
        toValue: 0.88,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(deleteModalOpacity, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDeleteConfirm(false);
      if (callback) {
        callback();
      }
    });
  };

  useEffect(() => {
    loadCommittee();
    const unsubLocal = nativeStorageService.subscribe(loadCommittee);
    
    // Live Cloud Firestore sync across multiple devices
    const unsubCloud = FirebaseService.subscribeCommittees((cloudList) => {
      if (cloudList) {
        if (cloudList.length > 0) {
          const found = cloudList.find(c => c.id === committeeId || (committee && c.joinCode === committee.joinCode));
          if (found) {
            setCommittee(found);
            nativeStorageService.getCommittees().then(localList => {
              const idx = localList.findIndex(c => c.id === found.id || c.joinCode === found.joinCode);
              if (idx >= 0) {
                localList[idx] = found;
                nativeStorageService.saveCommittees(localList);
              }
            });
          }
        }
      }
    });

    return () => {
      unsubLocal();
      unsubCloud();
    };
  }, [committeeId]);

  const loadCommittee = async () => {
    const list = await nativeStorageService.getCommittees();
    const found = list.find(c => c.id === committeeId);
    if (found) {
      setCommittee(found);
    } else {
      setCommittee(null);
      onBack();
    }
  };

  let totalCycles = 5;
  if (committee) {
    if (committee.memberCount) {
      totalCycles = committee.memberCount;
    } else if (committee.numberOfMembers) {
      totalCycles = committee.numberOfMembers;
    } else if (committee.totalCycles) {
      totalCycles = committee.totalCycles;
    } else if (committee.duration) {
      totalCycles = committee.duration;
    }
  }
  totalCycles = Math.max(2, totalCycles);

  let memberCount = 0;
  if (committee && committee.members) {
    memberCount = committee.members.length;
  }

  const isExplicitlyForming = committee?.status && (committee.status.toLowerCase().includes('forming') || committee.status.toLowerCase().includes('waiting'));
  const isFull = !isExplicitlyForming && (memberCount >= totalCycles);

  // Auto select random recipient ONLY when committee is 100% full and active
  useEffect(() => {
    if (isFull && committee && !committee.currentRecipientId && committee.members && committee.members.length >= totalCycles) {
      const randomIndex = Math.floor(Math.random() * committee.members.length);
      const chosen = committee.members[randomIndex];
      const chosenId = chosen.id;
      FirebaseService.updateRecipientWinner(committee.id, chosenId, 1);
    }
  }, [isFull, committee?.currentRecipientId, committee?.id, totalCycles]);

  let recipient: Member | null = null;
  if (isFull) {
    if (committee) {
      if (committee.members) {
        if (committee.members.length > 0) {
          if (committee.currentRecipientId) {
            const foundRecipient = committee.members.find(m => m.id === committee.currentRecipientId || m.userId === committee.currentRecipientId);
            if (foundRecipient) {
              recipient = foundRecipient;
            }
          }
        }
      }
    }
  }

  // First-time spin reveal experience per user/device
  useEffect(() => {
    if (isFull && recipient && committee) {
      const seenKey = `seen_spin_${committee.id}_${committee.currentRecipientId || 'rec'}`;
      nativeStorageService.getItem(seenKey).then(seen => {
        if (!seen) {
          nativeStorageService.setItem(seenKey, 'true');
          setShouldAnimateSpin(true);
          setCelebrationMessage(`🎉 ${recipient.name} is the recipient for Cycle 1!`);
          
          celebrationOpacity.setValue(0);
          Animated.timing(celebrationOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();

          setTimeout(() => {
            Animated.timing(celebrationOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start(() => {
              setCelebrationMessage(null);
            });
          }, 5000);
        }
      });
    }
  }, [isFull, recipient?.id, committee?.id, committee?.currentRecipientId]);

  let currentCycle = 1;
  if (committee) {
    if (committee.currentCycle) {
      currentCycle = committee.currentCycle;
    }
  }

  // Allow deleting all committees for testing
  const canDelete = true;

  let memberModalVisible = false;
  if (selectedMember) {
    memberModalVisible = true;
  }

  let memberNameDisplay = 'Member';
  let memberPhoneDisplay = '03XX XXXXXXX';
  let memberPayoutDisplay = 'EasyPaisa';
  let memberProofUrl: string | null = null;
  let memberStatusDisplay = 'Pending Payment';
  let isMemberVerified = false;
  let isMemberSubmitted = false;
  let isSelectedMemberRecipient = false;

  if (selectedMember) {
    if (selectedMember.name) {
      const cleanName = selectedMember.name.replace(/\s*\(you\)/i, '').trim();
      const isMe = selectedMember.id === currentUser?.id || (currentUser?.phone && selectedMember.phone && currentUser.phone.replace(/[^0-9]/g, '') === selectedMember.phone.replace(/[^0-9]/g, ''));
      if (isMe) {
        memberNameDisplay = `${cleanName} (You)`;
      } else {
        memberNameDisplay = cleanName;
      }
    }
    if (selectedMember.phone) {
      memberPhoneDisplay = selectedMember.phone;
    }
    if (selectedMember.paymentMethod) {
      memberPayoutDisplay = selectedMember.paymentMethod;
    }
    if (selectedMember.paymentProofUrl) {
      memberProofUrl = selectedMember.paymentProofUrl;
    }

    if (isFull && recipient && (selectedMember.id === recipient.id || selectedMember.id === committee?.currentRecipientId)) {
      isSelectedMemberRecipient = true;
      memberStatusDisplay = 'Recipient';
    } else if (selectedMember.paymentStatus === 'verified') {
      isMemberVerified = true;
      memberStatusDisplay = 'Paid ✓';
    } else if (selectedMember.paymentStatus === 'submitted' || selectedMember.paymentProofUrl) {
      isMemberSubmitted = true;
      memberStatusDisplay = 'Submitted';
    } else {
      if (isFull) {
        memberStatusDisplay = 'Pending';
      } else {
        memberStatusDisplay = 'Joined';
      }
    }
  }

  // Check if current logged in user is strictly the recipient of this cycle
  let isCurrentUserRecipient = false;
  if (isFull && currentUser && recipient) {
    const cleanUserPhone = (currentUser.phone || '').replace(/[^0-9]/g, '');
    const cleanRecipientPhone = (recipient.phone || '').replace(/[^0-9]/g, '');
    const cleanUserName = (currentUser.name || '').trim().toLowerCase().replace('(you)', '').trim();
    const cleanRecipientName = (recipient.name || '').trim().toLowerCase().replace('(you)', '').trim();

    if (currentUser.id === recipient.id || (recipient as any).userId === currentUser.id) {
      isCurrentUserRecipient = true;
    } else if (cleanUserPhone && cleanRecipientPhone && cleanUserPhone === cleanRecipientPhone) {
      isCurrentUserRecipient = true;
    } else if (cleanUserName && cleanRecipientName && cleanUserName === cleanRecipientName) {
      isCurrentUserRecipient = true;
    }
  }

  // ONLY the recipient can verify other members (gated behind viewing the proof)
  let canVerifySelectedMember = false;
  if (isFull && isCurrentUserRecipient && selectedMember) {
    if (!isSelectedMemberRecipient && !isMemberVerified) {
      canVerifySelectedMember = true;
    }
  }

  const isVerificationReady = !memberProofUrl || hasViewedProof;

  let joinLink = '';
  if (committee) {
    joinLink = `kameti-ai.web.app/join?code=${committee.joinCode}`;
  }

  let poolAmountDisplay = '0';
  let contributionAmountDisplay = '0';
  if (committee) {
    const pool = committee.totalPool || ((committee.contributionAmount || 0) * totalCycles);
    poolAmountDisplay = pool.toLocaleString();
    if (committee.contributionAmount) {
      contributionAmountDisplay = committee.contributionAmount.toLocaleString();
    }
  }

  const handleDeleteCommittee = () => {
    if (!committee) {
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCommittee = async () => {
    if (!committee) {
      return;
    }
    const comId = committee.id;
    closeDeleteModal(() => {
      onBack();
      setTimeout(async () => {
        await nativeStorageService.deleteCommittee(comId);
        await FirebaseService.deleteCommittee(comId);
      }, 50);
    });
  };

  const handleShareLink = () => {
    if (!committee) {
      return;
    }
    const count = committee.memberCount || 5;
    const pool = committee.totalPool || (count * committee.contributionAmount);
    LinkingService.shareCommitteeLink(committee.name, committee.joinCode, pool);
  };

  const handleVerifyMemberPayment = async (memberToVerify: Member) => {
    if (!committee) {
      return;
    }

    closeModal();

    await nativeStorageService.verifyMemberPayment(committee.id, memberToVerify.id);
    await FirebaseService.verifyMemberPayment(committee.id, memberToVerify.id);
    await loadCommittee();
    Alert.alert('Payment Verified ✓', `Successfully marked ${memberToVerify.name.replace(/\s*\(you\)/i, '')}'s payment as verified.`);
  };

  const handleProofSubmitted = async (imageUrl: string, notes: string) => {
    if (!committee) {
      return;
    }

    const user = await nativeStorageService.getUser();
    if (!user) {
      return;
    }
    let memberIdToUpdate = user.id;

    if (committee.members) {
      const myMember = committee.members.find(m => m.id === user.id || m.phone === user.phone || m.name.includes('(You)'));
      if (myMember) {
        memberIdToUpdate = myMember.id;
      } else if (committee.members.length > 0) {
        memberIdToUpdate = committee.members[0].id;
      }
    }

    await nativeStorageService.submitMemberProof(committee.id, memberIdToUpdate, imageUrl, notes);
    await FirebaseService.submitMemberProof(committee.id, memberIdToUpdate, imageUrl, notes);
    await loadCommittee();
  };

  let headerCommitteeName = 'Loading...';
  if (committee) {
    headerCommitteeName = committee.name;
  }

  let recipientName = 'Selecting Recipient...';
  let recipientMethod = '—';
  let recipientAccount = '—';

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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Navbar */}
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

          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerCommitteeName}
          </Text>

          <TactilePressable
            style={styles.headerBtn}
            scaleTo={0.9}
            onPress={() => {
              if (onOpenProfile) {
                onOpenProfile();
              }
            }}
          >
            <User size={20} color="#000000" strokeWidth={2.5} />
          </TactilePressable>
        </View>

        {/* Celebration Banner for First-Time Spin Reveal */}
        {celebrationMessage && (
          <Animated.View style={[styles.celebrationBanner, { opacity: celebrationOpacity }]}>
            <Sparkles size={16} color="#000000" strokeWidth={2.5} />
            <Text style={styles.celebrationBannerText}>{celebrationMessage}</Text>
          </Animated.View>
        )}

        {/* Dynamic Top Card */}
        {isFull ? (
          /* Next Payout Card When Full */
          <View style={styles.topCard}>
            <View style={styles.topCardHeader}>
              <View style={styles.recipientBadge}>
                <Text style={styles.recipientBadgeText}>NEXT PAYOUT</Text>
              </View>
              <TactilePressable
                style={styles.cardDeleteBtn}
                scaleTo={0.88}
                onPress={handleDeleteCommittee}
              >
                <Trash2 size={15} color="#71717A" strokeWidth={2} />
              </TactilePressable>
            </View>

            <Text style={[styles.recipientName, { marginTop: 6 }]}>{recipientName}</Text>

            <Text style={styles.payoutAmount}>PKR {poolAmountDisplay}</Text>
            <Text style={styles.dueDateLabel}>Due on 5th of each month</Text>

            <View style={styles.accountCard}>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Payment Method</Text>
                <Text style={styles.accountValue}>{recipientMethod}</Text>
              </View>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Account Number</Text>
                <Text style={styles.accountValue}>{recipientAccount}</Text>
              </View>
            </View>

            {/* Submit Payment Proof Button - Only visible for contributing members, NOT the recipient */}
            {isCurrentUserRecipient ? (
              <View style={styles.recipientBanner}>
                <Check size={14} color="#000000" strokeWidth={2.5} />
                <Text style={styles.recipientBannerText}>You are receiving PKR {poolAmountDisplay} this cycle</Text>
              </View>
            ) : (
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
                  <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />
                </View>
              </TactilePressable>
            )}
          </View>
        ) : (
          /* Invite Members Card When Committee Is Not Full */
          <View style={styles.topCard}>
            <View style={styles.topCardHeader}>
              <View style={styles.inviteBadge}>
                <Users size={12} color="#000000" strokeWidth={2.5} />
                <Text style={styles.inviteBadgeText}>WAITING FOR MEMBERS</Text>
              </View>
              {canDelete && (
                <TactilePressable
                  style={styles.cardDeleteBtn}
                  scaleTo={0.88}
                  onPress={handleDeleteCommittee}
                >
                  <Trash2 size={15} color="#EF4444" strokeWidth={2} />
                </TactilePressable>
              )}
            </View>

            <Text style={styles.inviteCardTitle}>Invite members to start</Text>

            {/* Join Link Display Card */}
            <View style={styles.accountCard}>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Join Link</Text>
                <TactilePressable
                  scaleTo={0.9}
                  onPress={() => {
                    handleShareLink();
                  }}
                >
                  <Copy size={13} color="#71717A" strokeWidth={2} />
                </TactilePressable>
              </View>
              <Text style={styles.linkText} numberOfLines={1}>{joinLink}</Text>
            </View>

            {/* Share Invite Link Button */}
            <TactilePressable
              containerStyle={{ width: '100%' }}
              style={styles.submitProofBtn}
              scaleTo={0.97}
              onPress={() => {
                handleShareLink();
              }}
            >
              <View style={styles.btnRow}>
                <Send size={14} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                <Text style={styles.submitProofText}>Share Invite Link</Text>
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
              currentUserId={currentUser?.id}
              currentUserPhone={currentUser?.phone}
              currentUserName={currentUser?.name}
              shouldAnimateSpin={shouldAnimateSpin}
              onSpinComplete={() => {
                setShouldAnimateSpin(false);
              }}
              onMemberPress={(m) => {
                setSelectedMember(m);
              }}
            />
          )}
        </View>

      </ScrollView>

      {/* Member Details Popup Modal with Proof Preview & Recipient Verification */}
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
                  <Text style={styles.infoRowLabel}>PAYMENT STATUS</Text>
                </View>
                <Text style={styles.infoRowValue}>{memberStatusDisplay}</Text>
              </View>
            </View>

            {/* Payment Proof Section - Shown for contributing members, replaced by notice for recipient */}
            {isSelectedMemberRecipient ? (
              <View style={styles.recipientNoProofNotice}>
                <Text style={styles.recipientNoProofNoticeText}>
                  {memberNameDisplay} is receiving the payout this cycle — no contribution payment required.
                </Text>
              </View>
            ) : (
              <View style={styles.proofSectionContainer}>
                <Text style={styles.proofSectionTitle}>ATTACHED PAYMENT PROOF</Text>
                
                {memberProofUrl ? (
                  <TactilePressable
                    style={styles.proofImageCard}
                    scaleTo={0.98}
                    onPress={() => {
                      setViewingProofUrl(memberProofUrl);
                      setHasViewedProof(true);
                    }}
                  >
                    <Image source={{ uri: memberProofUrl }} style={styles.proofThumbnail} resizeMode="cover" />
                    <View style={styles.proofZoomOverlay}>
                      <ZoomIn size={14} color="#000000" strokeWidth={2.5} />
                      <Text style={styles.proofZoomText}>Tap to view full receipt</Text>
                    </View>
                  </TactilePressable>
                ) : (
                  <View style={styles.noProofCard}>
                    <FileText size={18} color="#A1A1AA" strokeWidth={2} />
                    <Text style={styles.noProofText}>No payment receipt uploaded yet</Text>
                  </View>
                )}
              </View>
            )}

            {/* Recipient Exclusive Verification Button (Gated by viewing proof) */}
            {canVerifySelectedMember && selectedMember && (
              <TactilePressable
                containerStyle={{ width: '100%', marginBottom: 10 }}
                style={[
                  styles.verifyBtn,
                  !isVerificationReady && { opacity: 0.45 }
                ]}
                disabled={!isVerificationReady}
                scaleTo={0.96}
                onPress={() => {
                  if (isVerificationReady) {
                    handleVerifyMemberPayment(selectedMember);
                  }
                }}
              >
                <CheckCheck size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.verifyBtnText}>
                  {isVerificationReady ? 'Verify & Mark as Paid' : 'View screenshot to enable verification'}
                </Text>
              </TactilePressable>
            )}

            {/* Close Button */}
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

      {/* Full-Screen Receipt Image Inspection Modal (Single Clean Explicit Close Button & Tap-to-Dismiss) */}
      <Modal
        visible={!!viewingProofUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setViewingProofUrl(null);
        }}
      >
        <Pressable
          style={styles.fullImageOverlay}
          onPress={() => {
            setViewingProofUrl(null);
          }}
        >
          {/* Explicit Single Clean Floating Close Button */}
          <Pressable
            style={styles.fullImageCloseBtn}
            hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
            onPress={() => {
              setViewingProofUrl(null);
            }}
          >
            <X size={22} color="#FFFFFF" strokeWidth={2.8} />
          </Pressable>

          {viewingProofUrl && (
            <Image
              source={{ uri: viewingProofUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      {/* Payment Proof Modal (Enabled when committee is full & user is not recipient) */}
      {isFull && committee && recipient && (
        <PaymentProofModal
          visible={showProofModal}
          onClose={() => {
            setShowProofModal(false);
          }}
          committee={committee}
          recipient={recipient}
          onSubmitProof={handleProofSubmitted}
        />
      )}

      {/* Custom Themed Delete Confirmation Modal with Tactile Spring Animation */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="none"
        onRequestClose={() => closeDeleteModal()}
      >
        <Animated.View style={[styles.confirmModalOverlay, { opacity: deleteModalOpacity }]}>
          <Animated.View
            style={[
              styles.confirmModalCard,
              {
                opacity: deleteModalOpacity,
                transform: [{ scale: deleteModalScale }],
              },
            ]}
          >
            <View style={styles.deleteIconCircleLarge}>
              <Trash2 size={24} color="#DC2626" strokeWidth={2.2} />
            </View>
            <Text style={styles.confirmModalTitle}>Delete Committee?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Are you sure you want to delete "{committee?.name}"? All member records and payment history will be permanently removed.
            </Text>

            <TactilePressable
              style={styles.confirmDeleteBtn}
              haptic="impactHeavy"
              scaleTo={0.96}
              onPress={confirmDeleteCommittee}
            >
              <Text style={styles.confirmDeleteBtnText}>Delete Committee</Text>
            </TactilePressable>

            <TactilePressable
              style={styles.confirmCancelBtn}
              haptic="selection"
              scaleTo={0.96}
              onPress={() => closeDeleteModal()}
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
    letterSpacing: -0.2,
    maxWidth: 200,
  },
  celebrationBanner: {
    backgroundColor: '#F4F4F5',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  celebrationBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  topCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  topCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recipientBadge: {
    backgroundColor: '#000000',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  recipientBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E4E4E7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  inviteBadgeText: {
    color: '#000000',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  inviteCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  payoutAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  dueDateLabel: {
    fontSize: 11.5,
    color: '#71717A',
    fontWeight: '500',
    marginBottom: 12,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  accountLabel: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '500',
  },
  accountValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  linkText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#000000',
    marginTop: 2,
  },
  submitProofBtn: {
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
  recipientBanner: {
    backgroundColor: '#E4E4E7',
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recipientBannerText: {
    color: '#000000',
    fontSize: 13,
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  modalMemberName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  modalMemberPhone: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
    marginBottom: 14,
  },
  modalInfoCards: {
    width: '100%',
    gap: 6,
    marginBottom: 12,
  },
  modalInfoRow: {
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  infoRowLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.6,
  },
  infoRowValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#000000',
    flexShrink: 1,
    textAlign: 'right',
  },
  proofSectionContainer: {
    width: '100%',
    marginBottom: 14,
  },
  proofSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  proofImageCard: {
    width: '100%',
    backgroundColor: '#F4F4F5',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  proofThumbnail: {
    width: '100%',
    height: 100,
  },
  proofZoomOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
  },
  proofZoomText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  noProofCard: {
    width: '100%',
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noProofText: {
    fontSize: 11.5,
    color: '#71717A',
    fontWeight: '500',
  },
  recipientNoProofNotice: {
    width: '100%',
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientNoProofNoticeText: {
    fontSize: 12,
    color: '#52525B',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  verifyBtn: {
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
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalClosePill: {
    width: '100%',
    backgroundColor: '#F4F4F5',
    borderRadius: 9999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClosePillText: {
    color: '#000000',
    fontSize: 13.5,
    fontWeight: '700',
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
  },
  fullImageCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 25,
  },
  fullImage: {
    width: '100%',
    height: '80%',
    borderRadius: 12,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 340,
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
  deleteIconCircleLarge: {
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
  confirmDeleteBtn: {
    width: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 9999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmDeleteBtnText: {
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
