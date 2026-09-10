import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Theme } from '../theme';
import { ShieldIcon, WaveformIcon, MessageIcon, ClockIcon } from '../components/Icons';
import { BiometricVoiceprintCard } from '../components/BiometricVoiceprintCard';
import { IncomingCallActions } from '../components/IncomingCallActions';
import { Contact, MOCK_OFFICIAL_CONTACTS } from '../mock/contactsData';

export interface IncomingCallScreenProps {
  contact?: Contact;
  onAcceptCall: () => void;
  onDeclineCall: () => void;
  onQuickMessage?: () => void;
  onRemindMe?: () => void;
}

export const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  contact = MOCK_OFFICIAL_CONTACTS[3], // HDFC Bank Priority Support
  onAcceptCall,
  onDeclineCall,
  onQuickMessage,
  onRemindMe,
}: IncomingCallScreenProps) => {

  const handleQuickMessage = (): void => {
    if (onQuickMessage) {
      onQuickMessage();
    } else {
      Alert.alert('💬 Quick Message Sent', '"Can I call you back in 5 minutes?" sent to caller.');
    }
  };

  const handleRemindMe = (): void => {
    if (onRemindMe) {
      onRemindMe();
    } else {
      Alert.alert('⏰ Reminder Set', 'AAWAZ will remind you about this call in 1 hour.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Pills */}
      <View style={styles.headerSection}>
        <View style={styles.incomingCallPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.incomingCallPillText}>
            INCOMING CALL • SECURE LINE
          </Text>
        </View>

        <View style={styles.syncRow}>
          <Text style={{ fontSize: 11 }}>🔒</Text>
          <Text style={styles.syncText}>Acoustic Channel Synchronized</Text>
        </View>
      </View>

      {/* Main Avatar Hero */}
      <View style={styles.heroSection}>
        <View style={styles.avatarOuterRing}>
          <View style={styles.avatarInnerRing}>
            <Text style={styles.avatarLogoTitle}>
              {contact.name.split(' ')[0].toUpperCase()}
            </Text>
            <Text style={styles.avatarLogoSubtitle}>
              {contact.badgeTag || 'PRIORITY'}
            </Text>
          </View>

          {/* Verified Checkmark Badge anchored at bottom right */}
          <View style={styles.verifiedBadgeAnchor}>
            <Text style={styles.verifiedCheckText}>✓</Text>
          </View>
        </View>

        {/* Caller Title & Subtitle */}
        <Text style={styles.callerName}>{contact.name}</Text>
        <Text style={styles.callerSubtitle}>
          {contact.subtitle || 'Official Banking Channel • 256-bit Encrypted'}
        </Text>

        {/* Verified Channel Badge Pill */}
        <View style={styles.verifiedChannelPill}>
          <ShieldIcon size={12} color={Theme.colors.verifiedGreen} />
          <Text style={styles.verifiedChannelText}>
            Verified Channel • Voiceprint Matched
          </Text>
        </View>

        {/* Active Monitoring Waveform Indicator Pill */}
        <View style={styles.monitoringPill}>
          <WaveformIcon size={14} color={Theme.colors.verifiedGreen} />
          <Text style={styles.monitoringText}>
            AAWAZ is actively monitoring this call
          </Text>
        </View>
      </View>

      {/* Biometric Voiceprint Card */}
      <View style={styles.cardContainer}>
        <BiometricVoiceprintCard confidencePercent={99.8} />

        {/* Quick Message & Remind Me Buttons */}
        <View style={styles.secondaryActionsRow}>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleQuickMessage}
          >
            <MessageIcon size={16} color={Theme.colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>Quick Message</Text>
          </Pressable>

          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRemindMe}
          >
            <ClockIcon size={16} color={Theme.colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>Remind Me</Text>
          </Pressable>
        </View>
      </View>

      {/* Flexible Spacer */}
      <View style={styles.spacer} />

      {/* Decline / Accept Call Control Buttons */}
      <IncomingCallActions
        onDecline={onDeclineCall}
        onAccept={onAcceptCall}
      />

      {/* Bottom Protection Footer */}
      <View style={styles.footerRow}>
        <ShieldIcon size={11} color={Theme.colors.verifiedGreen} />
        <Text style={styles.footerText}>
          Protected by AAWAZ Acoustic Biometrics
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.bgDark,
    paddingBottom: Theme.spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  incomingCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.verifiedGreen,
  },
  incomingCallPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: Theme.colors.textPrimary,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
  },
  avatarOuterRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    position: 'relative',
    backgroundColor: '#0F172A',
    elevation: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  avatarInnerRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
  },
  avatarLogoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  avatarLogoSubtitle: {
    fontSize: 8,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  verifiedBadgeAnchor: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.verifiedGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.bgDark,
  },
  verifiedCheckText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  callerName: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  callerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  verifiedChannelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.verifiedGreenGlow,
    borderWidth: 1,
    borderColor: Theme.colors.verifiedGreenBorder,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  verifiedChannelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.verifiedGreen,
  },
  monitoringPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
  },
  monitoringText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  cardContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.sm,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  spacer: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Theme.spacing.xs,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
});
