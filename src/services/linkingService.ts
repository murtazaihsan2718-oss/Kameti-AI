import * as Linking from 'expo-linking';
import { Share, Alert } from 'react-native';

export class LinkingService {
  /**
   * Generate clean deep link for Expo development & production scheme
   */
  static generateJoinLink(joinCode: string): string {
    return Linking.createURL('join', {
      queryParams: { join: joinCode },
    });
  }

  /**
   * Generate working HTTPS web URL on Firebase project domain (kameti-ai.web.app)
   */
  static generateWebLink(joinCode: string): string {
    return `https://kameti-ai.web.app/join?code=${joinCode}`;
  }

  /**
   * Open native OS Share Sheet with clean "Join my committee" text and link
   */
  static async shareCommitteeLink(committeeName: string, joinCode: string, poolAmount: number) {
    const webLink = this.generateWebLink(joinCode);
    const message = `Join my committee\n${webLink}`;

    try {
      await Share.share({
        message,
        url: webLink,
        title: `Join my committee`,
      });
    } catch (err: any) {
      Alert.alert('Sharing Error', err?.message || 'Could not open share dialog.');
    }
  }

  /**
   * Parse incoming URL to extract join code parameter
   */
  static parseJoinCodeFromUrl(url: string | null): string | null {
    if (!url) return null;
    try {
      const parsed = Linking.parse(url);
      if (parsed.queryParams && (parsed.queryParams.join || parsed.queryParams.code)) {
        const val = parsed.queryParams.join || parsed.queryParams.code;
        return String(val).toUpperCase();
      }
    } catch (err) {
      console.log('[LinkingService] Parsing error:', err);
    }
    return null;
  }
}
