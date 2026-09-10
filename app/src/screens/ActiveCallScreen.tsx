import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Theme } from '../theme';
import { ShieldIcon, WaveformIcon, ChevronDownIcon } from '../components/Icons';
import { StateToggle } from '../components/StateToggle';
import { ThreatAlertBanner } from '../components/ThreatAlertBanner';
import { InCallControlBar } from '../components/InCallControlBar';
import { HighRiskWarningModal } from '../components/HighRiskWarningModal';
import { Keypad } from '../components/Keypad';
import { Contact, MOCK_OFFICIAL_CONTACTS } from '../mock/contactsData';
import { useAawazRisk } from '../native/AawazRisk';
import { JudgeDemoBar } from '../components/JudgeDemoBar';

export interface ActiveCallScreenProps {
  contact?: Contact;
  onEndCall: () => void;
  onOpenReportDetails: () => void;
  onMinimizeCall?: () => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  contact = MOCK_OFFICIAL_CONTACTS[3], // HDFC Bank Priority Support
  onEndCall,
  onOpenReportDetails: _onOpenReportDetails,
  onMinimizeCall,
}: ActiveCallScreenProps) => {
  // Local UI View State
  const [overrideState, setOverrideState] = useState<'auto' | 'verified' | 'unverified'>('auto');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
  const [showKeypadModal, setShowKeypadModal] = useState<boolean>(false);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(258); // Starts at 04:18

  // Live risk from the Track 1 native detector (DeviceEventEmitter "AawazRisk").
  const { risk, eventCount } = useAawazRisk(true);

  // Active call duration timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev: number) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // In 'auto' the screen shows the real native verdict; the toggle stays as a
  // manual demo override. Contract states: ANALYSING | OK | ELEVATED | HIGH.
  const isNativeHigh = risk.state === 'HIGH';
  const isAnalysing = risk.state === 'ANALYSING';
  const isAnomalyState =
    overrideState === 'unverified' ||
    (overrideState === 'auto' && isNativeHigh);

  // Risk shown in the modal: the live native score, falling back to the
  // component default only when the detector has not scored a window yet.
  const displayedRiskScore = risk.score > 0 ? risk.score : 82;

  // Native HIGH pops the same warning modal the manual override uses. Guarded on
  // the transition so it does not reopen every second while the state persists.
  const prevNativeHighRef = useRef<boolean>(false);
  useEffect(() => {
    if (overrideState !== 'auto') return;
    if (isNativeHigh && !prevNativeHighRef.current) {
      setShowWarningModal(true);
    }
    prevNativeHighRef.current = isNativeHigh;
  }, [isNativeHigh, overrideState]);

  // When switching to unverified state, automatically pop up the High Risk Warning Modal
  const handleSelectState = (state: 'auto' | 'verified' | 'unverified'): void => {
    setOverrideState(state);
    if (state === 'unverified') {
      setShowWarningModal(true);
    }
  };

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const mm = mins < 10 ? `0${mins}` : `${mins}`;
    const ss = secs < 10 ? `0${secs}` : `${secs}`;
    return `${mm}:${ss}`;
  };

  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* Top Demo State Switcher */}
      <StateToggle
        overrideState={overrideState}
        onSelectState={handleSelectState}
      />

      {/* Screen Header Bar */}
      <View style={styles.header}>
        <Pressable
          style={styles.collapseButton}
          onPress={onMinimizeCall}
          hitSlop={10}
        >
          <ChevronDownIcon size={16} color={Theme.colors.textPrimary} />
        </Pressable>

        <Text
          style={[
            styles.headerStatusText,
            isAnomalyState && styles.headerStatusTextAlert,
          ]}
        >
          {isAnomalyState ? 'ALERT' : 'CELLULAR ENCRYPTED'}
        </Text>

        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* State 2 Anomaly Threat Banner Header */}
        {isAnomalyState ? (
          <ThreatAlertBanner
            onPressDetails={() => setShowWarningModal(true)}
          />
        ) : null}

        {/* Avatar Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarOuterRing}>
            <View style={styles.avatarInnerRing}>
              <Text style={styles.avatarLogoTitle}>
                {getInitials(contact.name)}
              </Text>
            </View>
            <View style={styles.verifiedBadgeAnchor}>
              <Text style={styles.verifiedCheckText}>✓</Text>
            </View>
          </View>

          {/* Caller Title */}
          <Text style={styles.callerName}>{contact.name}</Text>

          {/* Verified Channel Pill */}
          <View style={styles.verifiedPill}>
            <ShieldIcon size={12} color={Theme.colors.verifiedGreen} />
            <Text style={styles.verifiedText}>Verified Channel</Text>
          </View>

          {/* Live Call Duration Readout */}
          <Text style={styles.timerText}>{formatTimer(secondsElapsed)}</Text>

          {/* Listening / Alert Waveform Indicator Pill */}
          <View
            style={[
              styles.waveformPill,
              isAnomalyState && styles.waveformPillAlert,
            ]}
          >
            <WaveformIcon
              size={14}
              color={isAnomalyState ? '#EF4444' : Theme.colors.verifiedGreen}
            />
            <Text
              style={[
                styles.waveformText,
                isAnomalyState && styles.waveformTextAlert,
              ]}
            >
              {isAnomalyState
                ? `AAWAZ alert: Voice anomaly (${displayedRiskScore}%)`
                : overrideState === 'auto' && isAnalysing
                ? `AAWAZ is analysing… (${eventCount})`
                : overrideState === 'auto'
                ? `AAWAZ is listening · ${risk.state} ${risk.score}%`
                : 'AAWAZ is listening'}
            </Text>
          </View>
        </View>

        {/* Judge demo: hear the voice, then see the detector's verdict. */}
        <JudgeDemoBar state={risk.state} score={risk.score} />

        {/* Flexible Spacer */}
        <View style={styles.spacer} />

        {/* Bottom In-Call Control Bar */}
        <InCallControlBar
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          onToggleMute={() => setIsMuted((prev: boolean) => !prev)}
          onPressKeypad={() => setShowKeypadModal(true)}
          onToggleSpeaker={() => setIsSpeakerOn((prev: boolean) => !prev)}
          onEndCall={onEndCall}
        />
      </View>

      {/* High Risk Warning Popup Modal */}
      <HighRiskWarningModal
        visible={showWarningModal}
        riskScore={displayedRiskScore}
        onEndCall={() => {
          setShowWarningModal(false);
          onEndCall();
        }}
        onContinueAnyway={() => setShowWarningModal(false)}
      />

      {/* In-Call Keypad Modal Overlay */}
      <Modal
        visible={showKeypadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKeypadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>In-Call Keypad</Text>
              <Pressable
                onPress={() => setShowKeypadModal(false)}
                hitSlop={10}
              >
                <Text style={styles.closeModalText}>Close ✕</Text>
              </Pressable>
            </View>

            <Keypad
              onPressDigit={(d: string) =>
                console.log(`DTMF tone sent: ${d}`)
              }
              onPressBackspace={() => {}}
            />
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
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
  },
  collapseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
  },
  collapseArrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginTop: -4,
  },
  headerStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: Theme.colors.textMuted,
  },
  headerStatusTextAlert: {
    color: '#EF4444',
  },
  headerRightPlaceholder: {
    width: 36,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
  },
  avatarOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    position: 'relative',
    backgroundColor: '#0F172A',
    elevation: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  avatarInnerRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
  },
  avatarLogoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#60A5FA',
  },
  verifiedBadgeAnchor: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.verifiedGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.bgDark,
  },
  verifiedCheckText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  callerName: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.verifiedGreenGlow,
    borderWidth: 1,
    borderColor: Theme.colors.verifiedGreenBorder,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
    marginBottom: Theme.spacing.md,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.verifiedGreen,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: Theme.spacing.md,
  },
  waveformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
  },
  waveformPillAlert: {
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
    borderColor: '#991B1B',
  },
  waveformText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  waveformTextAlert: {
    color: '#F87171',
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Theme.colors.bgDark,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    paddingBottom: Theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  closeModalText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textMuted,
  },
});
