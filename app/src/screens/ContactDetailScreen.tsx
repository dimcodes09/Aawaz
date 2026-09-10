import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Theme } from '../theme';
import { ArrowLeftIcon, Signal5GIcon, MoreOptionsIcon } from '../components/Icons';
import { DossierHero } from '../components/DossierHero';
import { QuickActionsRow } from '../components/QuickActionsRow';
import { CallHistoryCard } from '../components/CallHistoryCard';
import { Contact } from '../mock/contactsData';
import { getCallSessionsForContact, CallSession } from '../mock/callHistoryData';

export interface ContactDetailScreenProps {
  contact: Contact;
  onBackPress: () => void;
  onInitiateCall: (phoneNumber: string, isVerified: boolean) => void;
  onOpenReport?: () => void;
}

export const ContactDetailScreen: React.FC<ContactDetailScreenProps> = ({
  contact,
  onBackPress,
  onInitiateCall,
  onOpenReport,
}: ContactDetailScreenProps) => {
  const sessions = getCallSessionsForContact(contact.id);

  const handleCall = (): void => {
    onInitiateCall(contact.phoneNumber, contact.isVerified);
  };

  const handleMessage = (): void => {
    Alert.alert('AAWAZ Secure Chat', `Opening encrypted chat session with ${contact.name}`);
  };

  const handleSecurityDossier = (): void => {
    Alert.alert(
      '🛡️ Voiceprint Enclave Security',
      `Certificate: 256-BIT-AAWAZ-ENCLAVE\nRegistered Entity: ${contact.name}\nVoiceprint Hash: 0x8F9A...C41E`
    );
  };

  const handleSessionPress = (session: CallSession): void => {
    if (onOpenReport) {
      onOpenReport();
    } else {
      Alert.alert(
        session.status === 'risk' ? '🚨 Intercepted Session Details' : '🟢 Verified Acoustic Session',
        `Session ID: ${session.id}\nTimestamp: ${session.timestamp}\nDuration: ${session.duration}\nRisk Score: ${session.riskScore}%`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Screen Header Bar */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerIconButton}
          onPress={onBackPress}
          hitSlop={10}
        >
          <ArrowLeftIcon size={18} color={Theme.colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>CONTACT DOSSIER</Text>

        <View style={styles.headerRight}>
          <Signal5GIcon isSecure={contact.isVerified} />
          <Pressable
            style={styles.headerIconButton}
            onPress={handleSecurityDossier}
            hitSlop={10}
          >
            <MoreOptionsIcon size={18} color={Theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Main Scrollable Dossier Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Hero Section */}
        <DossierHero contact={contact} channelId="ENC-8822" />

        {/* Quick Action Buttons (Message, Call, Security) */}
        <QuickActionsRow
          onPressMessage={handleMessage}
          onPressCall={handleCall}
          onPressSecurity={handleSecurityDossier}
        />

        {/* Call History / Enclave Session Logs */}
        <CallHistoryCard
          sessions={sessions}
          onPressSession={handleSessionPress}
          onPressEnclaveLog={handleSecurityDossier}
        />

        {/* Technical Details Section */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsHeaderTitle}>DETAILS</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Channel type</Text>
              <View style={styles.valueWithBadge}>
                <View style={styles.blueDot} />
                <Text style={styles.detailValueText}>
                  {contact.category ? `${contact.category} (Enrolled)` : 'Official Institution (Enrolled)'}
                </Text>
              </View>
            </View>

            <View style={[styles.detailRow, styles.detailBorder]}>
              <Text style={styles.detailLabel}>Verified since</Text>
              <Text style={styles.detailValueText}>14 August 2024</Text>
            </View>

            <View style={[styles.detailRow, styles.detailBorder]}>
              <Text style={styles.detailLabel}>Enrolled Number</Text>
              <View style={styles.valueWithBadge}>
                <Text style={styles.monoValueText}>{contact.phoneNumber}</Text>
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailRow, styles.detailBorder]}>
              <Text style={styles.detailLabel}>Voiceprint Hash</Text>
              <Text style={styles.greenMonoText}>SHA-256 • #ENC-8822</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.bgDark,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderDarkSubtle,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    color: Theme.colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xxl,
  },
  detailsContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.lg,
  },
  detailsHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  detailsCard: {
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.md,
    gap: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailBorder: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderDarkSubtle,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  valueWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  detailValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  monoValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
    fontFamily: 'monospace',
  },
  primaryBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#60A5FA',
    fontFamily: 'monospace',
  },
  greenMonoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    fontFamily: 'monospace',
  },
});
