import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import { WarningShieldIcon, ChevronRightIcon } from './Icons';

export interface ThreatAlertBannerProps {
  alertTitle?: string;
  alertSubtitle?: string;
  onPressDetails: () => void;
}

export const ThreatAlertBanner: React.FC<ThreatAlertBannerProps> = ({
  alertTitle = 'Possible synthetic voice detected',
  alertSubtitle = 'Deepfake vocoder pattern found',
  onPressDetails,
}: ThreatAlertBannerProps) => {
  return (
    <Pressable
      style={({ pressed }: { pressed: boolean }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={onPressDetails}
    >
      <View style={styles.warningIconSquare}>
        <WarningShieldIcon size={16} color="#F87171" />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.alertTitleText} numberOfLines={1}>
          {alertTitle}
        </Text>
        <Text style={styles.alertSubtitleText} numberOfLines={1}>
          {alertSubtitle}
        </Text>
      </View>

      <View style={styles.detailsButtonRow}>
        <Text style={styles.detailsText}>Details</Text>
        <ChevronRightIcon size={14} color="#FCA5A5" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(69, 10, 10, 0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: Theme.spacing.xs,
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  warningIconSquare: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  alertTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  alertSubtitleText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(254, 202, 202, 0.85)',
  },
  detailsButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  detailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCA5A5',
  },
});
