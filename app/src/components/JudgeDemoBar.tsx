import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import { playDemoClip, AawazRiskState } from '../native/AawazRisk';

export interface JudgeDemoBarProps {
  state: AawazRiskState;
  score: number;
}

/**
 * Two-tap demonstration for a live audience.
 *
 * Tapping a button plays that clip out loud through the speaker and pushes the
 * same PCM through the existing Mode A detector. The verdict shown here is the
 * real AawazRisk value the native pipeline produced - nothing is hardcoded and
 * there is no second detector.
 */
export const JudgeDemoBar: React.FC<JudgeDemoBarProps> = ({
  state,
  score,
}: JudgeDemoBarProps) => {
  const verdict = (): { text: string; tone: 'ok' | 'high' | 'wait' } => {
    if (state === 'HIGH') return { text: `AI VOICE DETECTED · ${score}% RISK`, tone: 'high' };
    if (state === 'OK') return { text: `GENUINE HUMAN VOICE · ${score}% RISK`, tone: 'ok' };
    if (state === 'ELEVATED') return { text: `ELEVATED · ${score}% RISK`, tone: 'high' };
    return { text: 'Tap a voice sample to analyse', tone: 'wait' };
  };

  const v = verdict();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>LIVE DEMO — LISTEN, THEN SEE THE VERDICT</Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.button, styles.realButton]}
          onPress={() => playDemoClip('real')}
        >
          <Text style={styles.buttonEmoji}>🔊</Text>
          <Text style={styles.buttonLabel}>REAL HUMAN</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.fakeButton]}
          onPress={() => playDemoClip('fake')}
        >
          <Text style={styles.buttonEmoji}>🔊</Text>
          <Text style={styles.buttonLabel}>AI VOICE</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.verdict,
          v.tone === 'ok' && styles.verdictOk,
          v.tone === 'high' && styles.verdictHigh,
        ]}
      >
        <Text
          style={[
            styles.verdictText,
            v.tone === 'ok' && styles.verdictTextOk,
            v.tone === 'high' && styles.verdictTextHigh,
          ]}
        >
          {v.text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  realButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Theme.colors.verifiedGreen,
  },
  fakeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  buttonEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  verdict: {
    marginTop: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
  },
  verdictOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Theme.colors.verifiedGreen,
  },
  verdictHigh: {
    backgroundColor: 'rgba(127, 29, 29, 0.45)',
    borderColor: '#991B1B',
  },
  verdictText: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  verdictTextOk: {
    color: Theme.colors.verifiedGreen,
  },
  verdictTextHigh: {
    color: '#F87171',
  },
});
