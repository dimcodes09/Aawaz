import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';

export interface StepProgressHeaderProps {
  currentStep: 1 | 2 | 3;
  totalSteps?: number;
  tagTitle?: string;
  isOptional?: boolean;
}

export const StepProgressHeader: React.FC<StepProgressHeaderProps> = ({
  currentStep,
  totalSteps = 3,
  tagTitle,
  isOptional = false,
}: StepProgressHeaderProps) => {
  return (
    <View style={styles.container}>
      {/* Top 3-segment progress indicator lines */}
      <View style={styles.barsRow}>
        {[1, 2, 3].map((stepNum: number) => {
          const isActive = stepNum === currentStep;
          const isPassed = stepNum < currentStep;

          return (
            <View
              key={`step-bar-${stepNum}`}
              style={[
                styles.barSegment,
                isActive && styles.barActive,
                isPassed && styles.barPassed,
              ]}
            />
          );
        })}
      </View>

      {/* Counter & Category Tag Header Row */}
      <View style={styles.metaRow}>
        <Text style={styles.stepCounterText}>
          STEP 0{currentStep}/0{totalSteps}
        </Text>

        {isOptional ? (
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalText}>OPTIONAL STEP</Text>
          </View>
        ) : tagTitle ? (
          <Text style={styles.tagTitleText}>{tagTitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  barSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  barActive: {
    backgroundColor: Theme.colors.verifiedBlueBright,
    elevation: 4,
    shadowColor: Theme.colors.verifiedBlueBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  barPassed: {
    backgroundColor: 'rgba(37, 99, 235, 0.4)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCounterText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  tagTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  optionalBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.verifiedGreenBorder,
  },
  optionalText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Theme.colors.verifiedGreen,
  },
});
