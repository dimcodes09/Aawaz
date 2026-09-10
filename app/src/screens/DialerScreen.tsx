import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Theme } from '../theme';
import { ArrowLeftIcon, Signal5GIcon, StatusDot } from '../components/Icons';
import { StateToggle } from '../components/StateToggle';
import { DialerDisplay } from '../components/DialerDisplay';
import { Keypad } from '../components/Keypad';
import { CallActionButton } from '../components/CallActionButton';
import { mockAcousticLookup, AcousticLookupResult } from '../mock/lookupData';

export interface DialerScreenProps {
  onBackPress?: () => void;
  // TODO(UI): expects call initiation handler from Track 3 (native call engine / WebRTC)
  onInitiateCall?: (phoneNumber: string, isVerified: boolean) => void;
}

export const DialerScreen: React.FC<DialerScreenProps> = ({
  onBackPress,
  onInitiateCall,
}: DialerScreenProps) => {
  // Local UI State (Rule 4 compliant: only UI view state)
  const [phoneNumber, setPhoneNumber] = useState<string>('18002026161');
  const [overrideState, setOverrideState] = useState<'auto' | 'verified' | 'unverified'>('auto');

  // Compute acoustic lookup result based on entered digits or demo toggle
  const lookupResult: AcousticLookupResult = useMemo(() => {
    // TODO(UI): expects real-time acoustic lookup event stream from Track 1 (ML inference engine)
    const baseResult = mockAcousticLookup(phoneNumber);

    if (overrideState === 'verified') {
      return {
        ...baseResult,
        isVerified: true,
        entityName: baseResult.isVerified ? baseResult.entityName : 'HDFC Bank Priority Support',
        securityMessage: 'Verified Channel available for this number.',
        voiceprintEnclaveActive: true,
      };
    }

    if (overrideState === 'unverified') {
      return {
        ...baseResult,
        isVerified: false,
        entityName: 'Unknown Individual Caller',
        securityMessage: "This number isn't on AAWAZ yet.",
        voiceprintEnclaveActive: false,
      };
    }

    return baseResult;
  }, [phoneNumber, overrideState]);

  const handleDigitPress = (digit: string): void => {
    if (phoneNumber.length < 15) {
      setPhoneNumber((prev: string) => prev + digit);
    }
  };

  const handleBackspace = (): void => {
    setPhoneNumber((prev: string) => prev.slice(0, -1));
  };

  const handleLongPressBackspace = (): void => {
    setPhoneNumber('');
  };

  const handleCall = (): void => {
    if (!phoneNumber) {
      Alert.alert('AAWAZ Dialer', 'Please enter a phone number to place a call.');
      return;
    }

    if (onInitiateCall) {
      // Pass call params to track 3 call engine handler if provided
      onInitiateCall(phoneNumber, lookupResult.isVerified);
    } else {
      // Mock call feedback for standalone UI testing
      Alert.alert(
        lookupResult.isVerified ? '🛡️ AAWAZ Enclave Call' : '📞 Unprotected Call',
        `Initiating call to ${phoneNumber}\nChannel State: ${
          lookupResult.isVerified ? 'VERIFIED ENCLAVE' : 'UNVERIFIED'
        }`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Demo State Toggle Bar */}
      <StateToggle
        overrideState={overrideState}
        onSelectState={setOverrideState}
      />

      {/* Screen Header Bar */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={onBackPress}
          hitSlop={10}
        >
          <ArrowLeftIcon size={20} color={Theme.colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>Dial a Number</Text>

        <View style={styles.headerRight}>
          <Signal5GIcon isSecure={lookupResult.isVerified} />
          <StatusDot active={true} isVerified={lookupResult.isVerified} />
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Dialer Display & Status Banner */}
        <DialerDisplay
          phoneNumber={phoneNumber}
          lookupResult={lookupResult}
        />

        {/* Flexible spacer */}
        <View style={styles.spacer} />

        {/* 4x3 Keypad Matrix */}
        <Keypad
          onPressDigit={handleDigitPress}
          onPressBackspace={handleBackspace}
          onLongPressBackspace={handleLongPressBackspace}
        />

        {/* Call Action Button & Security Footer */}
        <CallActionButton
          isVerified={lookupResult.isVerified}
          disabled={phoneNumber.length === 0}
          onPressCall={handleCall}
        />
      </View>
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
  backButton: {
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
    fontSize: Theme.typography.title.fontSize,
    fontWeight: Theme.typography.title.fontWeight,
    color: Theme.colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: Theme.spacing.md,
  },
  spacer: {
    flex: 1,
  },
});
