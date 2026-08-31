import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, SafeAreaView, StatusBar as RNStatusBar, Animated, Easing, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as NavigationBar from 'expo-navigation-bar';
import { LayoutGrid, Bot, Clock } from 'lucide-react-native';
import { colors } from './src/theme/theme';
import { nativeStorageService } from './src/services/storageService';
import { LinkingService } from './src/services/linkingService';
import { FirebaseService } from './src/services/firebaseService';
import { Member, UserProfile } from './src/types/dataTypes';

import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CommitteeRoomScreen } from './src/screens/CommitteeRoomScreen';
import { CreateCommitteeScreen } from './src/screens/CreateCommitteeScreen';
import { JoinCommitteeScreen } from './src/screens/JoinCommitteeScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ChatAssistantScreen } from './src/screens/ChatAssistantScreen';
import { TactilePressable } from './src/components/TactilePressable';
import { aiService } from './src/services/aiService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState<'home' | 'voice' | 'activity'>('home');
  const [activeScreen, setActiveScreen] = useState<'home' | 'room' | 'create' | 'join' | 'profile'>('home');
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('c1');
  const [prefilledJoinCode, setPrefilledJoinCode] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;

  const currentScreenKey = `${currentTab}_${activeScreen}_${selectedCommitteeId}`;

  useEffect(() => {
    screenFadeAnim.setValue(0.7);
    screenTranslateY.setValue(8);
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentScreenKey]);

  useEffect(() => {
    // Hide top status bar icons
    RNStatusBar.setHidden(true, 'none');

    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor('transparent');
      // Hide Android bottom system navigation bar in sticky immersive mode
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardOpen(false);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      }
    });

    nativeStorageService.init().then(async () => {
      // Start on Onboarding / Sign In screen on app launch
      setIsReady(true);
    });

    const unsubStorage = nativeStorageService.subscribe(async () => {
      const user = await nativeStorageService.getUser();
      setCurrentUser(user);
    });

    const handleUrl = async (url: string | null) => {
      const joinCode = LinkingService.parseJoinCodeFromUrl(url);
      if (joinCode) {
        setPrefilledJoinCode(joinCode);
        await autoJoinCommitteeByCode(joinCode);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      subscription.remove();
      unsubStorage();
    };
  }, []);

  const autoJoinCommitteeByCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    try {
      const currentList = await nativeStorageService.getCommittees();
      let committee = currentList.find(c => c.joinCode === cleanCode);
      if (!committee) {
        const cloudCommittee = await FirebaseService.getCommitteeByCode(cleanCode);
        if (cloudCommittee) {
          committee = cloudCommittee;
        }
      }

      if (committee) {
        const user = await nativeStorageService.getUser();
        if (!user) {
          setActiveScreen('join');
          return;
        }
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

        await FirebaseService.joinCommittee(committee.id, newMember);
        const localList = await nativeStorageService.getCommittees();
        const exists = localList.some(c => c.id === committee?.id);
        if (!exists) {
          await nativeStorageService.saveCommittees([{ ...committee, members: [...committee.members, newMember] }, ...localList]);
        }

        setSelectedCommitteeId(committee.id);
        setCurrentTab('home');
        setActiveScreen('room');
      } else {
        setActiveScreen('join');
      }
    } catch (err) {
      console.log('[NativeAutoJoin] Error joining:', err);
      setActiveScreen('join');
    }
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
        <Text style={styles.loadingText}>Loading Kameti AI...</Text>
      </SafeAreaView>
    );
  }

  const handleNavigate = (screenName: string, params: any = {}) => {
    if (screenName === 'room') {
      let nextId = 'c1';
      if (params.committeeId) {
        nextId = params.committeeId;
      }
      setSelectedCommitteeId(nextId);
      setActiveScreen('room');
    } else if (screenName === 'create') {
      setActiveScreen('create');
    } else if (screenName === 'join') {
      let codeParam = '';
      if (params.joinCode) {
        codeParam = params.joinCode;
      }
      setPrefilledJoinCode(codeParam);
      setActiveScreen('join');
    } else if (screenName === 'profile') {
      setActiveScreen('profile');
    } else if (screenName === 'home') {
      setActiveScreen('home');
      setCurrentTab('home');
    }
  };

  const renderActiveScreen = () => {
    if (currentTab === 'activity') {
      return (
        <NotificationsScreen
          onOpenCommittee={(id) => {
            setSelectedCommitteeId(id);
            setCurrentTab('home');
            setActiveScreen('room');
          }}
          onBack={() => {
            setCurrentTab('home');
            setActiveScreen('home');
          }}
          onOpenProfile={() => {
            setCurrentTab('home');
            setActiveScreen('profile');
          }}
        />
      );
    }

    if (currentTab === 'voice') {
      return (
        <ChatAssistantScreen
          onBack={() => {
            setCurrentTab('home');
            setActiveScreen('home');
          }}
          onOpenProfile={() => {
            setCurrentTab('home');
            setActiveScreen('profile');
          }}
        />
      );
    }

    if (activeScreen === 'profile') {
      return (
        <ProfileScreen
          onBack={() => setActiveScreen('home')}
          onLogout={() => {
            setCurrentUser(null);
            aiService.clearSession();
            setActiveScreen('home');
            setCurrentTab('home');
          }}
        />
      );
    }

    if (activeScreen === 'room') {
      return (
        <CommitteeRoomScreen
          committeeId={selectedCommitteeId}
          onBack={() => setActiveScreen('home')}
          onOpenProfile={() => {
            setCurrentTab('home');
            setActiveScreen('profile');
          }}
        />
      );
    }

    if (activeScreen === 'create') {
      return (
        <CreateCommitteeScreen
          onBack={() => setActiveScreen('home')}
          onCreated={(id) => {
            setSelectedCommitteeId(id);
            setActiveScreen('room');
          }}
          onOpenProfile={() => {
            setCurrentTab('home');
            setActiveScreen('profile');
          }}
        />
      );
    }

    if (activeScreen === 'join') {
      return (
        <JoinCommitteeScreen
          initialCode={prefilledJoinCode}
          onBack={() => setActiveScreen('home')}
          onJoined={(id) => {
            setSelectedCommitteeId(id);
            setActiveScreen('room');
          }}
        />
      );
    }

    return (
      <HomeScreen
        onNavigate={handleNavigate}
        onOpenVoice={() => {
          setCurrentTab('voice');
        }}
      />
    );
  };

  let isHomeActive = false;
  if (currentTab === 'home') {
    if (activeScreen === 'home') {
      isHomeActive = true;
    }
  }

  let isVoiceActive = false;
  if (currentTab === 'voice') {
    isVoiceActive = true;
  }

  let isActivityActive = false;
  if (currentTab === 'activity') {
    isActivityActive = true;
  }

  let homeIconColor = '#71717A';
  if (isHomeActive) {
    homeIconColor = '#FFFFFF';
  }

  let voiceIconColor = '#71717A';
  if (isVoiceActive) {
    voiceIconColor = '#FFFFFF';
  }

  let activityIconColor = '#71717A';
  if (isActivityActive) {
    activityIconColor = '#FFFFFF';
  }

  let topPaddingValue = 16;
  if (Platform.OS === 'android') {
    topPaddingValue = 28;
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: topPaddingValue }]}>
        <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
        <OnboardingScreen
          onComplete={(user) => {
            setCurrentUser(user);
            setActiveScreen('home');
            setCurrentTab('home');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPaddingValue }]}>
      {/* 100% hidden status bar with zero black cutout bar */}
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />

      {/* Main Screen Content with Smooth Transition Animation */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: screenFadeAnim,
            transform: [{ translateY: screenTranslateY }],
          },
        ]}
      >
        {renderActiveScreen()}
      </Animated.View>

      {/* Modern Floating Dock Navigation Bar with Tactile Haptic Feedback (hidden when typing) */}
      {!isKeyboardOpen && (
        <View style={styles.floatingDockContainer}>
          <View style={styles.floatingDock}>
            <TactilePressable
              haptic="selection"
              scaleTo={0.92}
              style={[styles.dockItem, isHomeActive && styles.dockItemActive]}
              onPress={() => {
                setCurrentTab('home');
                setActiveScreen('home');
              }}
            >
              <LayoutGrid size={18} color={homeIconColor} />
              <Text style={[styles.dockText, isHomeActive && styles.dockTextActive]}>
                Home
              </Text>
            </TactilePressable>

            <TactilePressable
              haptic="selection"
              scaleTo={0.92}
              style={[styles.dockItem, isVoiceActive && styles.dockItemActive]}
              onPress={() => {
                setCurrentTab('voice');
              }}
            >
              <Bot size={18} color={voiceIconColor} />
              <Text style={[styles.dockText, isVoiceActive && styles.dockTextActive]}>
                Ask
              </Text>
            </TactilePressable>

            <TactilePressable
              haptic="selection"
              scaleTo={0.92}
              style={[styles.dockItem, isActivityActive && styles.dockItemActive]}
              onPress={() => {
                setCurrentTab('activity');
                setActiveScreen('home');
              }}
            >
              <Clock size={18} color={activityIconColor} />
              <Text style={[styles.dockText, isActivityActive && styles.dockTextActive]}>
                Activity
              </Text>
            </TactilePressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  floatingDockContainer: {
    position: 'absolute',
    bottom: 12,
    left: 24,
    right: 24,
    zIndex: 100,
  },
  floatingDock: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: '#F4F4F5',
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  dockItemActive: {
    backgroundColor: '#000000',
  },
  dockText: {
    fontSize: 10.5,
    color: '#71717A',
    fontWeight: '600',
    marginTop: 1,
  },
  dockTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
