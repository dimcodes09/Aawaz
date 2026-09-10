import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';
import { FingerprintIcon } from './Icons';

export interface BiometricVoiceprintCardProps {
  confidencePercent?: number;
  hashAlgorithm?: string;
}

export const BiometricVoiceprintCard: React.FC<BiometricVoiceprintCardProps> = ({
  confidencePercent = 99.8,
  hashAlgorithm = 'SHA-512',
}: BiometricVoiceprintCardProps) => {
  return (
    <View style={styles.card}>
      {/* Left Icon Square */}
      <View style={styles.iconSquare}>
        <FingerprintIcon size={22} color="#60A5FA" />
      </View>

      {/* Center Details */}
      <View style={styles.infoContainer}>
        <Text style={styles.cardTitle}>Biometric Voiceprint</Text>
        <Text style={styles.cardStatusText}>
          Enrolled & Authenticated ({confidencePercent}%)
        </Text>
      </View>

      {/* Right Tamper-Proof Badge */}
      <View style={styles.rightBadgeContainer}>
        <View style={styles.shaBadge}>
          <Text style={styles.shaText}>{hashAlgorithm}</Text>
        </View>
        <Text style={styles.tamperText}>Tamper-Proof</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    marginVertical: Theme.spacing.sm,
  },
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.cardDark,
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  cardStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.verifiedGreen,
  },
  rightBadgeContainer: {
    alignItems: 'flex-end',
  },
  shaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
    marginBottom: 2,
  },
  shaText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  tamperText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
});
