import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import {
  AdminIcon,
  TaxIcon,
  CyberIcon,
  BankIcon,
  HospitalIcon,
  PersonIcon,
  ShieldIcon,
  PhoneIcon,
} from './Icons';
import { Contact } from '../mock/contactsData';

export interface ContactCardProps {
  contact: Contact;
  onPressCall: (contact: Contact) => void;
  onPressCard?: (contact: Contact) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onPressCall,
  onPressCard,
}: ContactCardProps) => {
  const renderAvatarIcon = () => {
    switch (contact.avatarType) {
      case 'admin':
        return <AdminIcon size={18} />;
      case 'cbdt':
        return <TaxIcon size={18} />;
      case 'cyber':
        return <CyberIcon size={18} />;
      case 'bank':
        return <BankIcon size={18} />;
      case 'hospital':
        return <HospitalIcon size={18} />;
      default:
        return <PersonIcon size={18} />;
    }
  };

  return (
    <Pressable
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPressCard && onPressCard(contact)}
    >
      {/* Left Avatar Badge */}
      <View style={styles.avatarBox}>
        {renderAvatarIcon()}
        <Text style={styles.badgeTagText}>{contact.badgeTag}</Text>
      </View>

      {/* Center Details */}
      <View style={styles.infoContainer}>
        <Text style={styles.contactName} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {contact.subtitle}
        </Text>

        {/* Verified Badge Pill */}
        {contact.isVerified ? (
          <View style={styles.verifiedPill}>
            <ShieldIcon size={11} color={Theme.colors.verifiedGreen} />
            <Text style={styles.verifiedText}>Verified Channel</Text>
          </View>
        ) : null}
      </View>

      {/* Right Quick Call Action Button */}
      <Pressable
        style={({ pressed }: { pressed: boolean }) => [
          styles.callButton,
          pressed && styles.callButtonPressed,
        ]}
        onPress={() => onPressCall(contact)}
        hitSlop={8}
      >
        <PhoneIcon size={16} color="#FFFFFF" />
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    gap: Theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardPressed: {
    backgroundColor: Theme.colors.surfaceDarkElevated,
    borderColor: Theme.colors.borderDark,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.cardDark,
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xs,
  },
  badgeTagText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Theme.colors.verifiedGreen,
    marginTop: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    marginBottom: 4,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.verifiedGreenGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.full,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.verifiedGreen,
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.colors.verifiedBlue,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Theme.colors.verifiedBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  callButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
});
