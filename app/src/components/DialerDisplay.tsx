import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';
import { ShieldIcon, LockIcon } from './Icons';
import { AcousticLookupResult } from '../mock/lookupData';

interface DialerDisplayProps {
  phoneNumber: string;
  lookupResult: AcousticLookupResult;
}

/**
 * Formats a raw digit string into standard spaced phone number representation
 */
export const formatPhoneNumber = (num: string): string => {
  if (!num) return '';
  const digits = num.replace(/\s+/g, '');
  if (digits.startsWith('1800') && digits.length >= 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.startsWith('+91') && digits.length > 3) {
    const raw = digits.slice(3);
    if (raw.length > 5) {
      return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
    }
    return `+91 ${raw}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return digits;
};

export const DialerDisplay: React.FC<DialerDisplayProps> = ({
  phoneNumber,
  lookupResult,
}: DialerDisplayProps) => {
  const isVerified = lookupResult.isVerified;
  const formattedNumber = formatPhoneNumber(phoneNumber) || ' ';

  return (
    <View style={styles.container}>
      {/* Phone Number Readout */}
      <Text
        style={styles.numberText}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {formattedNumber}
      </Text>

      {/* Entity Title Subtext */}
      <Text style={styles.entityText}>
        {lookupResult.entityName}
      </Text>

      {/* Channel Verification Status Banner */}
      <View
        style={[
          styles.statusBanner,
          isVerified ? styles.statusBannerVerified : styles.statusBannerUnverified,
        ]}
      >
        {isVerified ? (
          <ShieldIcon size={14} color={Theme.colors.verifiedGreen} />
        ) : (
          <LockIcon size={12} color={Theme.colors.textMuted} />
        )}
        <Text
          style={[
            styles.bannerText,
            isVerified ? styles.bannerTextVerified : styles.bannerTextUnverified,
          ]}
        >
          {lookupResult.securityMessage}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    minHeight: 140,
  },
  numberText: {
    fontSize: Theme.typography.numberDisplay.fontSize,
    fontWeight: Theme.typography.numberDisplay.fontWeight,
    letterSpacing: Theme.typography.numberDisplay.letterSpacing,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  entityText: {
    fontSize: Theme.typography.subtitle.fontSize,
    fontWeight: Theme.typography.subtitle.fontWeight,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    gap: Theme.spacing.sm,
  },
  statusBannerVerified: {
    backgroundColor: Theme.colors.verifiedGreenGlow,
    borderColor: Theme.colors.verifiedGreenBorder,
  },
  statusBannerUnverified: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: Theme.colors.borderDark,
  },
  bannerText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  bannerTextVerified: {
    color: Theme.colors.verifiedGreen,
  },
  bannerTextUnverified: {
    color: Theme.colors.textSecondary,
  },
});
