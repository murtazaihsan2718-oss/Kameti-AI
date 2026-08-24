import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { RefreshCw, Star, Check, Clock, Plus } from 'lucide-react-native';
import { Committee, Member } from '../types/dataTypes';
import { TactilePressable } from './TactilePressable';

interface CircleCommitteeProps {
  committee: Committee;
  onMemberPress: (member: Member) => void;
  onSpinPress?: () => void;
}

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width - 48, 300);
const RADIUS = 105;
const CENTER = CIRCLE_SIZE / 2;

export const CircleCommittee: React.FC<CircleCommitteeProps> = ({
  committee,
  onMemberPress,
  onSpinPress,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  let members: Member[] = [];
  if (committee.members) {
    if (committee.members.length > 0) {
      members = committee.members;
    }
  }

  let totalSlots = 5;
  if (committee.memberCount) {
    totalSlots = committee.memberCount;
  } else if (committee.totalCycles) {
    totalSlots = committee.totalCycles;
  } else if (committee.duration) {
    totalSlots = committee.duration;
  }

  let isFull = false;
  if (members.length >= totalSlots) {
    isFull = true;
  }

  let currentRecipientId = '';
  if (isFull) {
    if (committee.currentRecipientId) {
      currentRecipientId = committee.currentRecipientId;
    } else if (members[0]) {
      currentRecipientId = members[0].id;
    }
  }

  const handleCenterSpin = () => {
    if (isSpinning || !isFull) {
      return;
    }

    setIsSpinning(true);
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      if (onSpinPress) {
        onSpinPress();
      }
    });
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1080deg'],
  });

  // Generate display nodes (actual members + open slots)
  const displayNodes: { type: 'member' | 'empty'; member?: Member; slotNumber?: number }[] = [];
  members.forEach((m) => {
    displayNodes.push({ type: 'member', member: m });
  });

  const remainingSlots = Math.max(0, totalSlots - members.length);
  for (let i = 0; i < remainingSlots; i++) {
    displayNodes.push({ type: 'empty', slotNumber: members.length + i + 1 });
  }

  return (
    <View style={styles.container}>
      <View style={[styles.circleContainer, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]}>
        
        {/* Center Node - Spin Wheel (Full) or Waiting Indicator (Forming) */}
        {isFull ? (
          <TactilePressable
            scaleTo={0.9}
            containerStyle={{ position: 'absolute', left: CENTER - 42, top: CENTER - 42, width: 84, height: 84, zIndex: 5 }}
            style={styles.centerRefreshCircle}
            onPress={handleCenterSpin}
          >
            <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
              <RefreshCw size={22} color="#000000" strokeWidth={2.2} />
            </Animated.View>
          </TactilePressable>
        ) : (
          <View style={styles.centerWaitingCircle}>
            <Clock size={20} color="#71717A" strokeWidth={2} />
            <Text style={styles.centerWaitingText}>Waiting</Text>
          </View>
        )}

        {/* Member Nodes and Open Slot Placeholders Arranged in Circle */}
        {displayNodes.map((node, index) => {
          const angle = (index * 2 * Math.PI) / displayNodes.length - Math.PI / 2;
          const x = CENTER + RADIUS * Math.cos(angle) - 24;
          const y = CENTER + RADIUS * Math.sin(angle) - 24;

          if (node.type === 'empty') {
            return (
              <View
                key={`empty-${index}`}
                style={[styles.nodeEmpty, { left: x, top: y }]}
              >
                <Plus size={14} color="#A1A1AA" strokeWidth={2} />
              </View>
            );
          }

          const member = node.member!;
          let isRecipient = false;
          if (isFull && member.id === currentRecipientId) {
            isRecipient = true;
          }

          let isPaid = false;
          if (isFull && !isRecipient) {
            if (index % 2 === 1) {
              isPaid = true;
            }
          }

          let initial = 'M';
          if (member.name) {
            initial = member.name[0].toUpperCase();
          }

          if (isRecipient) {
            return (
              <TactilePressable
                key={member.id}
                scaleTo={0.88}
                containerStyle={{ position: 'absolute', left: x, top: y, width: 48, height: 48, zIndex: 10 }}
                style={styles.nodeRecipient}
                onPress={() => {
                  onMemberPress(member);
                }}
              >
                <Text style={styles.recipientInitial}>{initial}</Text>
                <View style={styles.starBadge}>
                  <Star size={9} color="#000000" fill="#000000" />
                </View>
              </TactilePressable>
            );
          }

          if (isPaid) {
            return (
              <TactilePressable
                key={member.id}
                scaleTo={0.9}
                containerStyle={{ position: 'absolute', left: x, top: y, width: 48, height: 48, zIndex: 10 }}
                style={styles.nodePaid}
                onPress={() => {
                  onMemberPress(member);
                }}
              >
                <Text style={styles.nodeInitial}>{initial}</Text>
                <View style={styles.checkBadge}>
                  <Check size={9} color="#FFFFFF" strokeWidth={3.5} />
                </View>
              </TactilePressable>
            );
          }

          return (
            <TactilePressable
              key={member.id}
              scaleTo={0.9}
              containerStyle={{ position: 'absolute', left: x, top: y, width: 48, height: 48, zIndex: 10 }}
              style={styles.nodePending}
              onPress={() => {
                onMemberPress(member);
              }}
            >
              <Text style={styles.nodeInitial}>{initial}</Text>
              {isFull && (
                <View style={styles.clockBadge}>
                  <Clock size={8} color="#71717A" strokeWidth={2.5} />
                </View>
              )}
            </TactilePressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  circleContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  centerRefreshCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  centerWaitingCircle: {
    position: 'absolute',
    left: CENTER - 42,
    top: CENTER - 42,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F4F4F5',
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWaitingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#71717A',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nodeRecipient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  recipientInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  starBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePaid: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePending: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeEmpty: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeInitial: {
    color: '#18181B',
    fontSize: 15,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
