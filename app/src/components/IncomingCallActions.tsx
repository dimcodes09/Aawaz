import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import { PhoneIcon, PhoneHangupIcon, SafeZoneShieldIcon } from './Icons';

export interface IncomingCallActionsProps {
  onDecline: () => void;
  onAccept: () => void;
}

export const IncomingCallActions: React.FC<IncomingCallActionsProps> = ({
  onDecline,
  onAccept,
}: IncomingCallActionsProps) => {
  return (
    <View style={styles.container}>
      {/* Decline Button (Red) */}
      <View style={styles.actionCol}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButton,
            styles.declineButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onDecline}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}
        >
          <PhoneHangupIcon size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.actionLabel}>Decline</Text>
      </View>

      {/* Center E2EE Security Indicator */}
      <View style={styles.centerBadgeCol}>
        <SafeZoneShieldIcon size={18} color={Theme.colors.textMuted} />
        <Text style={styles.e2eeText}>E2EE</Text>
      </View>

      {/* Accept Button (Green) */}
      <View style={styles.actionCol}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.circleButton,
            styles.acceptButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onAccept}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}
        >
          <PhoneIcon size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.actionLabel}>Accept</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: Theme.spacing.xl,
    marginVertical: Theme.spacing.lg,
  },
  actionCol: {
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  circleButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#EF4444',
    elevation: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  acceptButton: {
    backgroundColor: '#16A34A',
    borderWidth: 1,
    borderColor: '#4ADE80',
    elevation: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  centerBadgeCol: {
    alignItems: 'center',
    gap: 3,
  },
  e2eeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Theme.colors.textMuted,
  },
});
