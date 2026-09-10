import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import {
  MicIcon,
  BellIcon,
  PeopleIcon,
  ShieldIcon,
  WarningShieldIcon,
} from './Icons';

export interface PermissionCardProps {
  step: 1 | 2 | 3;
  onGrantPermission: () => void;
  onSkip?: () => void;
  onPressWhyNeedThis?: () => void;
}

export const PermissionCard: React.FC<PermissionCardProps> = ({
  step,
  onGrantPermission,
  onSkip,
  onPressWhyNeedThis,
}: PermissionCardProps) => {
  return (
    <View style={styles.container}>
      {/* Hero Icon Ring */}
      <View style={styles.heroRingOuter}>
        <View style={styles.heroRingInner}>
          {step === 1 ? (
            <MicIcon size={34} color="#60A5FA" />
          ) : step === 2 ? (
            <BellIcon size={34} color="#60A5FA" />
          ) : (
            <PeopleIcon size={34} color="#60A5FA" />
          )}
        </View>

        {/* Small Anchored Badge Icon */}
        {step === 1 ? (
          <View style={styles.badgeAnchorGreen}>
            <ShieldIcon size={12} color="#FFFFFF" />
          </View>
        ) : step === 2 ? (
          <View style={styles.badgeAnchorAmber}>
            <View style={styles.amberDot} />
          </View>
        ) : (
          <View style={styles.badgeAnchorUser}>
            <Text style={{ fontSize: 10 }}>👤</Text>
          </View>
        )}
      </View>

      {/* Main Title Header */}
      <Text style={styles.titleText}>
        {step === 1
          ? 'AAWAZ needs your microphone.'
          : step === 2
          ? 'Stay alerted, even in the background.'
          : 'Find your verified contacts faster.'}
      </Text>

      {/* Main Body Description */}
      <Text style={styles.bodyDescriptionText}>
        {step === 1 ? (
          <>
            To detect synthetic voices in real time, AAWAZ listens during your
            verified calls only —{' '}
            <Text style={styles.highlightText}>
              never in the background outside a call.
            </Text>
          </>
        ) : step === 2 ? (
          'AAWAZ needs to notify you immediately if a synthetic voice is detected mid-call, even if the app isn’t in focus.'
        ) : (
          'AAWAZ can match people already in your phone who also use AAWAZ. This step is optional — you can add verified contacts manually anytime.'
        )}
      </Text>

      {/* Privacy / Security Badge Pill or Threat Alert Card */}
      {step === 1 ? (
        <View style={styles.securityBadgePill}>
          <Text style={styles.securityBadgeIcon}>🔒</Text>
          <Text style={styles.securityBadgeText}>
            On-device acoustic enclave processing
          </Text>
        </View>
      ) : step === 2 ? (
        <View style={styles.threatAlertCard}>
          <View style={styles.threatHeaderRow}>
            <View style={styles.threatTitleLeft}>
              <WarningShieldIcon size={14} color="#F87171" />
              <Text style={styles.threatTitleText}>AAWAZ Threat Shield</Text>
            </View>
            <Text style={styles.threatTimeText}>Now</Text>
          </View>
          <Text style={styles.threatBodyText}>
            Possible synthetic voice intercepted mid-call.
          </Text>
        </View>
      ) : (
        <View style={styles.securityBadgePill}>
          <ShieldIcon size={12} color={Theme.colors.verifiedGreen} />
          <Text style={styles.securityBadgeText}>
            Contacts never leave your device unhashed
          </Text>
        </View>
      )}

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Primary Action Button */}
      <Pressable
        style={({ pressed }: { pressed: boolean }) => [
          styles.grantButton,
          pressed && styles.grantButtonPressed,
        ]}
        onPress={onGrantPermission}
      >
        <Text style={styles.grantButtonText}>
          {step === 1
            ? 'Allow Microphone Access  ›'
            : step === 2
            ? 'Allow Notifications  ›'
            : 'Allow Contacts Access  ›'}
        </Text>
      </Pressable>

      {/* Secondary Action Link / Skip */}
      {step === 1 ? (
        <Pressable
          style={styles.linkButton}
          onPress={onPressWhyNeedThis}
          hitSlop={8}
        >
          <Text style={styles.linkButtonText}>Why do you need this? 💬</Text>
        </Pressable>
      ) : step === 3 ? (
        <Pressable style={styles.linkButton} onPress={onSkip} hitSlop={8}>
          <Text style={styles.linkButtonText}>Skip for now</Text>
        </Pressable>
      ) : (
        <View style={{ height: 24 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
  },
  heroRingOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
    position: 'relative',
    backgroundColor: '#0F172A',
    elevation: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  heroRingInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
  },
  badgeAnchorGreen: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.verifiedGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.bgDark,
  },
  badgeAnchorAmber: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.bgDark,
  },
  amberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  badgeAnchorUser: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.surfaceDarkElevated,
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
    lineHeight: 28,
  },
  bodyDescriptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.sm,
  },
  highlightText: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  securityBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    gap: 8,
  },
  securityBadgeIcon: {
    fontSize: 12,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  threatAlertCard: {
    width: '100%',
    backgroundColor: 'rgba(127, 29, 29, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
  },
  threatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  threatTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  threatTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F87171',
  },
  threatTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  threatBodyText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FCA5A5',
  },
  spacer: {
    flex: 1,
  },
  grantButton: {
    width: '100%',
    height: 54,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.verifiedBlue,
    borderWidth: 1,
    borderColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    elevation: 6,
    shadowColor: Theme.colors.verifiedBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  grantButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  grantButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  linkButton: {
    paddingVertical: Theme.spacing.xs,
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
});
