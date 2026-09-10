import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';
import { ShieldIcon } from './Icons';
import { Contact } from '../mock/contactsData';
import { formatPhoneNumber } from './DialerDisplay';

export interface DossierHeroProps {
  contact: Contact;
  channelId?: string;
}

export const DossierHero: React.FC<DossierHeroProps> = ({
  contact,
  channelId = 'ENC-8822',
}: DossierHeroProps) => {
  const words = contact.name.split(' ').filter(Boolean);
  const mainTitle = words[0]?.toUpperCase() || 'AAWAZ';
  const subTitle = words.slice(1, 3).join(' ').toUpperCase() || contact.badgeTag || 'OFFICIAL';

  return (
    <View style={styles.container}>
      {/* Avatar Ring Container */}
      <View style={styles.avatarOuterRing}>
        <View style={styles.avatarInnerRing}>
          <Text style={styles.avatarLogoTitle}>{mainTitle}</Text>
          <Text style={styles.avatarLogoSubtitle}>{subTitle}</Text>
        </View>

        {/* Verified Checkmark Badge anchored at bottom right */}
        {contact.isVerified ? (
          <View style={styles.verifiedBadgeAnchor}>
            <Text style={styles.verifiedBadgeCheck}>✓</Text>
          </View>
        ) : null}
      </View>

      {/* Contact Name & Description */}
      <Text style={styles.contactName}>{contact.name}</Text>
      <Text style={styles.subtitle}>{contact.subtitle}</Text>

      {/* Formatted Phone Number */}
      <Text style={styles.phoneNumber}>
        {formatPhoneNumber(contact.phoneNumber)}
      </Text>

      {/* Verified Channel Banner Pill */}
      {contact.isVerified ? (
        <View style={styles.verifiedBannerPill}>
          <ShieldIcon size={12} color={Theme.colors.verifiedGreen} />
          <Text style={styles.verifiedBannerText}>Verified Channel</Text>
          <View style={styles.pillDot} />
          <Text style={styles.encText}>{channelId}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
  },
  avatarOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    position: 'relative',
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    backgroundColor: '#0F172A',
  },
  avatarInnerRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 4,
  },
  avatarLogoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  avatarLogoSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginTop: 1,
    textAlign: 'center',
  },
  verifiedBadgeAnchor: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B1220',
  },
  verifiedBadgeCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  contactName: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 6,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#CBD5E1',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  verifiedBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
  },
  verifiedBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.2,
  },
  pillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34D399',
  },
  encText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6EE7B7',
    fontFamily: 'monospace',
  },
});
