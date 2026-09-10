import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';

export interface AcousticMetricsGridProps {
  acousticMatchPercent: number;
  vocoderAnomaly: string;
  vocoderSubtext: string;
  acousticJitter: string;
  jitterSubtext: string;
}

export const AcousticMetricsGrid: React.FC<AcousticMetricsGridProps> = ({
  acousticMatchPercent,
  vocoderAnomaly,
  vocoderSubtext,
  acousticJitter,
  jitterSubtext,
}: AcousticMetricsGridProps) => {
  return (
    <View style={styles.container}>
      {/* Metric Card 1: Acoustic Match */}
      <View style={styles.metricCard}>
        <Text style={styles.metricTitle}>ACOUSTIC MATCH</Text>
        <Text style={[styles.metricValue, styles.metricRed]}>
          {acousticMatchPercent}%
        </Text>
        <Text style={styles.metricSubtext}>Target › 98%</Text>
      </View>

      {/* Metric Card 2: Vocoder Anomaly */}
      <View style={styles.metricCard}>
        <Text style={styles.metricTitle}>VOCODER ANOMALY</Text>
        <Text style={[styles.metricValue, styles.metricRed]}>
          {vocoderAnomaly}
        </Text>
        <Text style={styles.metricSubtext}>{vocoderSubtext}</Text>
      </View>

      {/* Metric Card 3: Acoustic Jitter */}
      <View style={styles.metricCard}>
        <Text style={styles.metricTitle}>ACOUSTIC JITTER</Text>
        <Text style={[styles.metricValue, styles.metricAmber]}>
          {acousticJitter}
        </Text>
        <Text style={styles.metricSubtext}>{jitterSubtext}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginVertical: Theme.spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Theme.colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
    textAlign: 'center',
  },
  metricRed: {
    color: '#EF4444',
  },
  metricAmber: {
    color: '#F59E0B',
  },
  metricSubtext: {
    fontSize: 9,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
});
