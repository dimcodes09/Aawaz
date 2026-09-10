import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Theme } from '../theme';
import { StepProgressHeader } from '../components/StepProgressHeader';
import { PermissionCard } from '../components/PermissionCard';
import { SafeZoneShieldIcon } from '../components/Icons';

export interface PermissionPrimerScreenProps {
  onCompletePrimer: () => void;
  onGrantMicrophone?: () => void;
  onGrantNotifications?: () => void;
  onGrantContacts?: () => void;
}

export const PermissionPrimerScreen: React.FC<PermissionPrimerScreenProps> = ({
  onCompletePrimer,
  onGrantMicrophone,
  onGrantNotifications,
  onGrantContacts,
}: PermissionPrimerScreenProps) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  const handleNextStep = (): void => {
    if (currentStep === 1) {
      if (onGrantMicrophone) onGrantMicrophone();
      // TODO(UI): expects Track 3 native microphone permission request dispatch
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (onGrantNotifications) onGrantNotifications();
      // TODO(UI): expects Track 3 native notification permission request dispatch
      setCurrentStep(3);
    } else {
      if (onGrantContacts) onGrantContacts();
      // TODO(UI): expects Track 3 native contacts permission request dispatch
      onCompletePrimer();
    }
  };

  const handleSkipContacts = (): void => {
    onCompletePrimer();
  };

  return (
    <View style={styles.container}>
      {/* Screen Header Bar */}
      <View style={styles.headerBanner}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.protocolBadge}>
            <SafeZoneShieldIcon size={12} color={Theme.colors.verifiedGreen} />
            <Text style={styles.protocolBadgeText}>
              FIRST-LAUNCH EXPERIENCE • PERMISSIONS PROTOCOL
            </Text>
          </View>
          <Text style={styles.mainTitle}>AAWAZ Permission Primer</Text>
          <Text style={styles.subtitleText}>
            Calm, trust-first consent flow explaining biometric protection.
          </Text>
        </View>

        {/* Zero Background Interception Guarantee Pill */}
        <View style={styles.guaranteePill}>
          <View style={styles.blueDot} />
          <Text style={styles.guaranteeText}>
            Zero Background Interception Guarantee
          </Text>
        </View>
      </View>

      {/* Step Progress Header Bar */}
      <StepProgressHeader
        currentStep={currentStep}
        tagTitle={
          currentStep === 1
            ? 'Core Biometrics'
            : currentStep === 2
            ? 'Real-Time Warning'
            : 'Optional'
        }
        isOptional={currentStep === 3}
      />

      {/* Permission Card Body */}
      <PermissionCard
        step={currentStep}
        onGrantPermission={handleNextStep}
        onSkip={handleSkipContacts}
        onPressWhyNeedThis={() => setShowWhyModal(true)}
      />

      {/* "Why do you need this?" Privacy Modal */}
      <Modal
        visible={showWhyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWhyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>🔒 Privacy First Architecture</Text>
              <Pressable
                onPress={() => setShowWhyModal(false)}
                hitSlop={10}
              >
                <Text style={styles.closeModalX}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalBodyText}>
              AAWAZ process voice features locally on-device inside a 256-bit
              hardware enclave. Your voice recordings or conversations are{' '}
              <Text style={{ color: Theme.colors.verifiedGreen, fontWeight: '700' }}>
                never uploaded to any server or recorded in the background.
              </Text>
            </Text>

            <Pressable
              style={styles.modalGotItButton}
              onPress={() => setShowWhyModal(false)}
            >
              <Text style={styles.modalGotItText}>I Understand</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.bgDark,
  },
  headerBanner: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderDarkSubtle,
    gap: Theme.spacing.xs,
  },
  headerTitleContainer: {
    gap: 2,
  },
  protocolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  protocolBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#60A5FA',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.textPrimary,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textMuted,
  },
  guaranteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    gap: 5,
    marginTop: 4,
  },
  blueDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#60A5FA',
  },
  guaranteeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#60A5FA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.lg,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  closeModalX: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textMuted,
  },
  modalBodyText: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: Theme.spacing.lg,
  },
  modalGotItButton: {
    width: '100%',
    height: 44,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.verifiedBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGotItText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
