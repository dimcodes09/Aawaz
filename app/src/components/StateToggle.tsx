import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';

export interface StateToggleProps {
  overrideState: 'auto' | 'verified' | 'unverified';
  onSelectState: (state: 'auto' | 'verified' | 'unverified') => void;
}

export const StateToggle: React.FC<StateToggleProps> = ({
  overrideState,
  onSelectState,
}: StateToggleProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>ACOUSTIC LOOKUP TESTER:</Text>
      <View style={styles.pillsContainer}>
        <Pressable
          style={[
            styles.pill,
            overrideState === 'verified' && styles.pillVerifiedActive,
          ]}
          onPress={() =>
            onSelectState(overrideState === 'verified' ? 'auto' : 'verified')
          }
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  overrideState === 'verified'
                    ? Theme.colors.verifiedGreen
                    : Theme.colors.textMuted,
              },
            ]}
          />
          <Text
            style={[
              styles.pillText,
              overrideState === 'verified' && styles.pillTextVerified,
            ]}
          >
            State 1: Enrolled Entity
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.pill,
            overrideState === 'unverified' && styles.pillUnverifiedActive,
          ]}
          onPress={() =>
            onSelectState(overrideState === 'unverified' ? 'auto' : 'unverified')
          }
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  overrideState === 'unverified'
                    ? Theme.colors.unverifiedAmber
                    : Theme.colors.textMuted,
              },
            ]}
          />
          <Text
            style={[
              styles.pillText,
              overrideState === 'unverified' && styles.pillTextUnverified,
            ]}
          >
            State 2: Unverified Entity
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderDark,
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: Theme.colors.accentCyan,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    gap: 6,
  },
  pillVerifiedActive: {
    backgroundColor: Theme.colors.verifiedGreenGlow,
    borderColor: Theme.colors.verifiedGreenBorder,
  },
  pillUnverifiedActive: {
    backgroundColor: Theme.colors.unverifiedBadgeBg,
    borderColor: Theme.colors.unverifiedAmberBorder,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  pillTextVerified: {
    color: Theme.colors.verifiedGreen,
  },
  pillTextUnverified: {
    color: Theme.colors.unverifiedAmber,
  },
});
