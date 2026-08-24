import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ArrowLeft, Bell, User } from 'lucide-react-native';
import { AppNotification } from '../types/dataTypes';
import { nativeStorageService } from '../services/storageService';
import { TactilePressable } from '../components/TactilePressable';

interface NotificationsScreenProps {
  onOpenCommittee: (id: string) => void;
  onBack?: () => void;
  onOpenProfile?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onOpenCommittee,
  onBack,
  onOpenProfile,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    loadNotifs();
  }, []);

  const loadNotifs = async () => {
    const list = await nativeStorageService.getNotifications();
    setNotifications(list);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header with Back Arrow < and Profile Avatar */}
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

          <Text style={styles.headerTitle}>Activity & Alerts</Text>

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

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Notifications</Text>
          <Text style={styles.pageSubtitle}>
            Stay updated on deadlines and payouts
          </Text>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Bell size={22} color="#71717A" strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              You're all caught up! Updates and payment alerts will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {notifications.map(item => {
              return (
                <TactilePressable
                  key={item.id}
                  style={styles.card}
                  haptic="selection"
                  scaleTo={0.98}
                  onPress={() => {
                    if (item.committeeId) {
                      onOpenCommittee(item.committeeId);
                    }
                  }}
                >
                  <View style={styles.cardIconCircle}>
                    <Bell size={16} color="#000000" strokeWidth={2} />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.timestamp}>{item.timestamp}</Text>
                    </View>
                    <Text style={styles.body}>{item.body}</Text>
                  </View>
                </TactilePressable>
              );
            })}
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
  emptyCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 3,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#71717A',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  listContainer: {
    gap: 10,
  },
  card: {
    backgroundColor: '#F4F4F5',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    lineHeight: 18,
    marginRight: 6,
  },
  timestamp: {
    flexShrink: 0,
    fontSize: 11,
    color: '#71717A',
    fontWeight: '600',
    marginTop: 1,
  },
  body: {
    fontSize: 12.5,
    color: '#52525B',
    lineHeight: 17,
    fontWeight: '500',
  },
});
