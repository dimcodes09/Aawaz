import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import { MessageIcon, PhoneIcon, SecurityActionIcon } from './Icons';

export interface QuickActionsRowProps {
  onPressMessage?: () => void;
  onPressCall: () => void;
  onPressSecurity?: () => void;
}

export const QuickActionsRow: React.FC<QuickActionsRowProps> = ({
  onPressMessage,
  onPressCall,
  onPressSecurity,
}: QuickActionsRowProps) => {
  return (
    <View style={styles.container}>
      {/* Message Button */}
      <View style={styles.actionItem}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButton,
            styles.circleButtonSecondary,
            pressed && styles.circleButtonPressed,
          ]}
          onPress={onPressMessage}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.15)', borderless: true }}
        >
          <MessageIcon size={20} color="#94A3B8" />
        </Pressable>
        <Text style={styles.actionLabel}>Message</Text>
      </View>

      {/* Main Glowing Call Button (Primary / Larger) */}
      <View style={styles.actionItem}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButtonPrimary,
            pressed && styles.circleButtonPressed,
          ]}
          onPress={onPressCall}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}
        >
          <PhoneIcon size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Call</Text>
      </View>

      {/* Security Action Button */}
      <View style={styles.actionItem}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButton,
            styles.circleButtonSecondary,
            pressed && styles.circleButtonPressed,
          ]}
          onPress={onPressSecurity}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.15)', borderless: true }}
        >
          <SecurityActionIcon size={20} color="#94A3B8" />
        </Pressable>
        <Text style={styles.actionLabel}>Security</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginVertical: Theme.spacing.md,
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
  },
  circleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonPrimary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#60A5FA',
    elevation: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  circleButtonSecondary: {
    backgroundColor: 'rgba(21, 31, 50, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    elevation: 4,
  },
  circleButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  actionLabelPrimary: {
    color: '#60A5FA',
    fontWeight: '700',
  },
});
