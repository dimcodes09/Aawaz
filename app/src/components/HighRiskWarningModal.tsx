import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Theme } from '../theme';
import { SafeZoneShieldIcon, WarningShieldIcon, ChevronRightIcon, PhoneIcon } from './Icons';

export interface HighRiskWarningModalProps {
  visible: boolean;
  riskScore?: number;
  onEndCall: () => void;
  onContinueAnyway: () => void;
}

export const HighRiskWarningModal: React.FC<HighRiskWarningModalProps> = ({
  visible,
  riskScore = 82,
  onEndCall,
  onContinueAnyway,
}: HighRiskWarningModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Top Header & Badges */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleRow}>
            <SafeZoneShieldIcon size={14} color="#60A5FA" />
            <Text style={styles.headerTitleText}>AAWAZ IN-CALL SHIELD</Text>
          </View>

          <View style={styles.headerTagsRow}>
            <View style={styles.secAlertBadge}>
              <Text style={styles.secAlertText}>SEC-ALERT</Text>
            </View>
            <View style={styles.vocoderBadge}>
              <Text style={styles.vocoderText}>VOCODER CLONE</Text>
            </View>
          </View>
        </View>

        {/* Main High Risk Alert Card Overlay */}
        <View style={styles.alertCard}>
          {/* Top Row: Warning Icon & Risk Score Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.warningSquare}>
              <WarningShieldIcon size={20} color="#EF4444" />
            </View>

            <View style={styles.riskScoreBadge}>
              <View style={styles.redDot} />
              <Text style={styles.riskScoreText}>Risk Score: {riskScore}%</Text>
            </View>
          </View>

          {/* Title & Critical Pill Tag */}
          <View style={styles.titleRow}>
            <Text style={styles.alertTitle}>High Risk Detected</Text>
            <View style={styles.criticalBadge}>
              <Text style={styles.criticalText}>CRITICAL</Text>
            </View>
          </View>

          {/* Main Description */}
          <Text style={styles.bodyDescription}>
            This voice shows signs of synthetic generation.
          </Text>

          {/* Diagnostic Vocoder Progress Box */}
          <View style={styles.diagnosticBox}>
            <View style={styles.diagnosticHeaderRow}>
              <View style={styles.diagTitleLeft}>
                <View style={styles.redRingDot} />
                <Text style={styles.diagLabelText}>Neural Vocoder Artifacts</Text>
              </View>

              <Text style={styles.positiveHighText}>POSITIVE (HIGH)</Text>
            </View>

            {/* Gradient Risk Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${riskScore}%` }]} />
            </View>

            <Text style={styles.diagSubtext}>
              Acoustic pattern does not match the enrolled biometric voiceprint of this institutional channel.
            </Text>
          </View>

          {/* Primary Recommended Action Button */}
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.endCallButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onEndCall}
          >
            <View style={{ transform: [{ rotate: '135deg' }] }}>
              <PhoneIcon size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.endCallButtonTitle}>End Call</Text>
            <Text style={styles.recommendedSubtext}>(Recommended)</Text>
          </Pressable>

          {/* Secondary Action Button */}
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.continueButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onContinueAnyway}
          >
            <Text style={styles.continueButtonText}>Continue Anyway</Text>
            <ChevronRightIcon size={14} color={Theme.colors.textSecondary} />
          </Pressable>
        </View>

        {/* Footer Security Badge */}
        <View style={styles.footerRow}>
          <SafeZoneShieldIcon size={12} color="#60A5FA" />
          <Text style={styles.footerText}>
            AAWAZ Acoustic Enclave protection is active.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 23, 0.94)',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#94A3B8',
  },
  headerTagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  secAlertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  secAlertText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#EF4444',
  },
  vocoderBadge: {
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  vocoderText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#F87171',
  },
  alertCard: {
    width: '100%',
    backgroundColor: '#1E0A0A',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    padding: Theme.spacing.lg,
    elevation: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  warningSquare: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  riskScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.5)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: '#991B1B',
    gap: 6,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  riskScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F87171',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.xs,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  criticalBadge: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  criticalText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.5,
  },
  bodyDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FECACA',
    lineHeight: 18,
    marginBottom: Theme.spacing.md,
  },
  diagnosticBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  diagnosticHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xs,
  },
  diagTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redRingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  diagLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  positiveHighText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: Theme.spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  diagSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: Theme.colors.textMuted,
    lineHeight: 14,
    marginTop: Theme.spacing.xs,
  },
  endCallButton: {
    width: '100%',
    height: 52,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Theme.spacing.sm,
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  endCallButtonTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recommendedSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FCA5A5',
  },
  continueButton: {
    width: '100%',
    height: 48,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  continueButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Theme.spacing.sm,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
});
