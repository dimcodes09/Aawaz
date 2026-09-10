import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MicIcon, KeypadIcon, SpeakerIcon, PhoneHangupIcon } from './Icons';

export interface InCallControlBarProps {
  isMuted: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onPressKeypad: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export const InCallControlBar: React.FC<InCallControlBarProps> = ({
  isMuted,
  isSpeakerOn,
  onToggleMute,
  onPressKeypad,
  onToggleSpeaker,
  onEndCall,
}: InCallControlBarProps) => {
  return (
    <View style={styles.container}>
      {/* Button 1: Mute */}
      <View style={styles.controlCol}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButton,
            isMuted ? styles.circleButtonMuted : styles.circleButtonNormal,
            pressed && styles.buttonPressed,
          ]}
          onPress={onToggleMute}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}
        >
          <MicIcon
            size={24}
            color={isMuted ? '#F87171' : '#FFFFFF'}
            muted={isMuted}
          />
        </Pressable>
        <Text style={[styles.controlLabel, isMuted && styles.controlLabelMuted]}>
          {isMuted ? 'Muted' : 'Mute'}
        </Text>
      </View>

      {/* Button 2: Keypad */}
      <View style={styles.controlCol}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButton,
            styles.circleButtonNormal,
            pressed && styles.buttonPressed,
          ]}
          onPress={onPressKeypad}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}
        >
          <KeypadIcon size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.controlLabel}>Keypad</Text>
      </View>

      {/* Button 3: Speaker */}
      <View style={styles.controlCol}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButton,
            isSpeakerOn ? styles.circleButtonActive : styles.circleButtonNormal,
            pressed && styles.buttonPressed,
          ]}
          onPress={onToggleSpeaker}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}
        >
          <SpeakerIcon
            size={24}
            color={isSpeakerOn ? '#60A5FA' : '#FFFFFF'}
            active={isSpeakerOn}
          />
        </Pressable>
        <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>
          Speaker
        </Text>
      </View>

      {/* Button 4: End Call */}
      <View style={styles.controlCol}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButton,
            styles.endCallButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onEndCall}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}
        >
          <PhoneHangupIcon size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.controlLabel, styles.endCallLabel]}>End Call</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  controlCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  circleButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  circleButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  circleButtonMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  endCallButton: {
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#F87171',
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  controlLabelActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  controlLabelMuted: {
    color: '#F87171',
    fontWeight: '700',
  },
  endCallLabel: {
    color: '#F87171',
    fontWeight: '700',
  },
});
