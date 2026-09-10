import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';
import { WarningShieldIcon } from './Icons';

export interface ThreatBannerCardProps {
  peakRiskScore: number;
  threatTitle?: string;
}

export const ThreatBannerCard: React.FC<ThreatBannerCardProps> = ({
  peakRiskScore,
  threatTitle = 'SYNTHETIC VOICE DETECTED',
}: ThreatBannerCardProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.warningIconContainer}>
        <WarningShieldIcon size={16} color="#F87171" />
      </View>

      <Text style={styles.threatTitleText}>{threatTitle}</Text>

      <View style={styles.peakRiskBox}>
        <Text style={styles.peakRiskNumber}>{peakRiskScore}% PEAK</Text>
        <Text style={styles.peakRiskLabel}>RISK</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(127, 29, 29, 0.35)',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#991B1B',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Theme.spacing.md,
    // Red threat glow
    elevation: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  warningIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threatTitleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.xs,
  },
  peakRiskBox: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#991B1B',
    paddingHorizontal: Theme.spacing.sm + 2,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
  },
  peakRiskNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  peakRiskLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.8,
  },
});
