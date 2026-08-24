import React from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Alert } from 'react-native';
import { colors } from '../theme/theme';
import { Committee } from '../types/dataTypes';
import { LinkingService } from '../services/linkingService';

interface ShareLinkModalProps {
  visible: boolean;
  committee: Committee;
  onClose: () => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ visible, committee, onClose }) => {
  const devLink = LinkingService.generateJoinLink(committee.joinCode);
  const webLink = LinkingService.generateWebLink(committee.joinCode);

  const handleShare = () => {
    LinkingService.shareCommitteeLink(committee.name, committee.joinCode, committee.totalPool);
  };

  const handleCopyLink = () => {
    Alert.alert('Copied!', `Join link copied to clipboard:\n${webLink}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.handle} />

          <Text style={styles.title}>🔗 Share Committee Join Link</Text>
          <Text style={styles.subtitle}>Send this link to members so they can tap and join instantly.</Text>

          <View style={styles.linkCard}>
            <Text style={styles.codeText}>Join Code: {committee.joinCode}</Text>
            <Text style={styles.urlText} numberOfLines={1}>{webLink}</Text>
            <Text style={styles.devText} numberOfLines={1}>Dev: {devLink}</Text>
          </View>

          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 Share via WhatsApp / Messages</Text>
          </Pressable>

          <Pressable style={styles.copyBtn} onPress={handleCopyLink}>
            <Text style={styles.copyBtnText}>📋 Copy Direct Link</Text>
          </Pressable>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 18,
  },
  linkCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderColor: colors.primary,
    borderWidth: 1.5,
    alignItems: 'center',
    marginVertical: 14,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gold,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
    textAlign: 'center',
    marginVertical: 2,
  },
  devText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  shareBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  copyBtn: {
    backgroundColor: colors.background,
    borderColor: colors.cardBorder,
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  copyBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
