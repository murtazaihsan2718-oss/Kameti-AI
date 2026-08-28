import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Alert } from 'react-native';

export interface RecordingResult {
  uri: string;
  durationMs?: number;
}

class AudioRecordingService {
  private recording: Audio.Recording | null = null;
  private isRecordingActive: boolean = false;

  /**
   * Request or verify microphone permissions with graceful error handling.
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      console.log('[Voice] Checking microphone permission status...');
      const current = await Audio.getPermissionsAsync();
      if (current.granted) {
        console.log('[Voice] Microphone permission already granted.');
        return true;
      }

      console.log('[Voice] Requesting microphone permission from user...');
      const response = await Audio.requestPermissionsAsync();
      if (response.granted) {
        console.log('[Voice] Microphone permission granted by user.');
        return true;
      }

      console.warn('[Voice] Microphone permission denied by user.');
      Alert.alert(
        'Microphone Permission Required',
        'Kameti needs microphone access so you can speak to the assistant. Please grant microphone permission in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    } catch (err: any) {
      console.error('[Voice] Error requesting microphone permission:', err);
      Alert.alert('Microphone Error', 'Could not request microphone access. Please try again.');
      return false;
    }
  }

  /**
   * Start recording audio locally.
   */
  async startRecording(): Promise<boolean> {
    try {
      // If an existing recording instance is still lingering, stop & discard it first
      if (this.recording) {
        await this.cancelRecording();
      }

      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        return false;
      }

      console.log('[Voice] Configuring audio session mode for recording...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      console.log('[Voice] Preparing local audio recording...');
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      this.recording = newRecording;
      this.isRecordingActive = true;
      console.log('[Voice] Recording started successfully.');
      return true;
    } catch (err: any) {
      console.error('[Voice] Failed to start audio recording:', err);
      this.recording = null;
      this.isRecordingActive = false;
      Alert.alert('Recording Error', 'Could not start audio recording. Please try again.');
      return false;
    }
  }

  /**
   * Stop active recording and retrieve the valid local audio URI.
   */
  async stopRecording(): Promise<RecordingResult | null> {
    try {
      if (!this.recording) {
        console.warn('[Voice] No active recording instance found to stop.');
        this.isRecordingActive = false;
        return null;
      }

      console.log('[Voice] Stopping audio recording...');
      const currentRec = this.recording;
      this.recording = null;
      this.isRecordingActive = false;

      const status = await currentRec.getStatusAsync();
      await currentRec.stopAndUnloadAsync();

      // Reset audio mode back for full-volume loudspeaker playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      }).catch(() => {});

      // Cycle audio subsystem to release any communication/earpiece lock
      await Audio.setIsEnabledAsync(false).catch(() => {});
      await Audio.setIsEnabledAsync(true).catch(() => {});
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      }).catch(() => {});

      const uri = currentRec.getURI();
      if (uri) {
        const durationMs = status?.durationMillis;
        console.log('[Voice] Recording stopped successfully.');
        console.log(`[Voice] Audio URI: ${uri}`);
        if (durationMs) {
          console.log(`[Voice] Audio Duration: ${(durationMs / 1000).toFixed(1)}s`);
        }
        return { uri, durationMs };
      } else {
        console.warn('[Voice] Recording stopped, but returned no URI.');
        return null;
      }
    } catch (err: any) {
      console.error('[Voice] Error stopping audio recording:', err);
      this.recording = null;
      this.isRecordingActive = false;
      return null;
    }
  }

  /**
   * Cancel and discard recording without keeping results.
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        const rec = this.recording;
        this.recording = null;
        this.isRecordingActive = false;
        await rec.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
        console.log('[Voice] Recording cancelled and discarded cleanly.');
      }
    } catch (e) {
      this.recording = null;
      this.isRecordingActive = false;
    }
  }

  /**
   * Query whether recording is currently in progress.
   */
  isRecording(): boolean {
    return this.isRecordingActive;
  }
}

export const audioRecordingService = new AudioRecordingService();
