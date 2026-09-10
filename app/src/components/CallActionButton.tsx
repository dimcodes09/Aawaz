import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import { ShieldIcon, PhoneIcon } from './Icons';

interface CallActionButtonProps {
  isVerified: boolean;
  disabled?: boolean;
  onPressCall: () => void;
}

export const CallActionButton: React.FC<CallActionButtonProps> = ({
  isVerified,
  disabled = false,
  onPressCall,
}: CallActionButtonProps) => {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }: { pressed: boolean }) => [
          styles.button,
          isVerified ? styles.buttonVerified : styles.buttonUnverified,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed,
        ]}
        onPress={onPressCall}
        disabled={disabled}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.15)' }}
      >
        {isVerified ? (
          <ShieldIcon size={18} color={Theme.colors.verifiedBlueText} />
        ) : (
          <PhoneIcon size={16} color={Theme.colors.unverifiedButtonText} />
        )}
        <Text
          style={[
            styles.buttonText,
            isVerified ? styles.buttonTextVerified : styles.buttonTextUnverified,
          ]}
        >
          {isVerified ? 'Call via Verified Channel' : 'Call Anyway (Unprotected)'}
        </Text>
      </Pressable>

      {/* Sub-text security status badge */}
      <View style={styles.securityIndicatorRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isVerified ? Theme.colors.verifiedGreen : Theme.colors.textMuted },
          ]}
        />
        <Text style={styles.securityText}>
          {isVerified
            ? '256-bit Enclave Voiceprint Protection Active'
            : "AAWAZ can't verify this call."}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: Theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    // Cyber blue glow for verified state
    elevation: 6,
    shadowColor: Theme.colors.verifiedBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  buttonVerified: {
    backgroundColor: Theme.colors.verifiedBlue,
    borderWidth: 1,
    borderColor: Theme.colors.verifiedBlueBright,
  },
  buttonUnverified: {
    backgroundColor: Theme.colors.unverifiedButtonBg,
    borderWidth: 1,
    borderColor: Theme.colors.unverifiedButtonBorder,
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonTextVerified: {
    color: Theme.colors.verifiedBlueText,
  },
  buttonTextUnverified: {
    color: Theme.colors.unverifiedButtonText,
  },
  securityIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  securityText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '500',
    color: Theme.colors.textMuted,
  },
});
