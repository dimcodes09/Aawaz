import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Theme } from '../theme';
import {
  DocumentIcon,
  SafeZoneShieldIcon,
  EvidencePackIcon,
  HomeIcon,
} from '../components/Icons';
import { ThreatBannerCard } from '../components/ThreatBannerCard';
import { AcousticMetricsGrid } from '../components/AcousticMetricsGrid';
import { VoiceTimelineCard } from '../components/VoiceTimelineCard';
import { MOCK_FORENSIC_REPORT, ForensicReport } from '../mock/forensicData';

export interface PostCallReportScreenProps {
  report?: ForensicReport;
  onBackToHome: () => void;
  onGenerateEvidencePack?: () => void;
}

export const PostCallReportScreen: React.FC<PostCallReportScreenProps> = ({
  report = MOCK_FORENSIC_REPORT,
  onBackToHome,
  onGenerateEvidencePack,
}: PostCallReportScreenProps) => {

  const handleEvidencePack = (): void => {
    if (onGenerateEvidencePack) {
      onGenerateEvidencePack();
    } else {
      Alert.alert(
        '🎵 Evidence Pack Generated',
        `Cryptographic SHA-256 Bundle Created:\n- Audio Hash: ${report.sha256Fingerprint}\n- Timeline Audit PDF\n- WAV Spectral Record`
      );
    }
  };

  const handleZeroTrustLog = (): void => {
    Alert.alert(
      '🛡️ Zero-Trust Enclave Log',
      `Session ID: ${report.sessionId}\nIntegrity: Verified On-Device\nHardware Hash: 0x9A...F4`
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Threat Status Header Pill */}
      <View style={styles.topStatusRow}>
        <View style={styles.threatArchivedTag}>
          <View style={styles.redDot} />
          <Text style={styles.threatArchivedText}>THREAT ARCHIVED</Text>
        </View>
      </View>

      {/* Screen Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.docIconBox}>
            <DocumentIcon size={16} color={Theme.colors.textPrimary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AAWAZ FORENSIC SESSION</Text>
            <Text style={styles.headerSubtitle}>Session ID: {report.sessionId}</Text>
          </View>
        </View>

        <Pressable
          style={styles.zeroTrustBadge}
          onPress={handleZeroTrustLog}
          hitSlop={8}
        >
          <SafeZoneShieldIcon size={12} color="#60A5FA" />
          <Text style={styles.zeroTrustText}>Zero-Trust Log</Text>
        </Pressable>
      </View>

      {/* Main Scrollable Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Red Threat Alert Banner Card */}
        <ThreatBannerCard peakRiskScore={report.peakRiskScore} />

        {/* Caller Title & Duration */}
        <View style={styles.callerSection}>
          <Text style={styles.callerTitle}>{report.contactName}</Text>
          <Text style={styles.callerStats}>
            Duration: {report.duration} • Ended at {report.endedAt}
          </Text>
        </View>

        {/* 3 Diagnostic Metric Cards Grid */}
        <AcousticMetricsGrid
          acousticMatchPercent={report.acousticMatchPercent}
          vocoderAnomaly={report.vocoderAnomaly}
          vocoderSubtext={report.vocoderSubtext}
          acousticJitter={report.acousticJitter}
          jitterSubtext={report.jitterSubtext}
        />

        {/* Voice Authenticity Timeline Card */}
        <VoiceTimelineCard
          sampleRate={report.sampleRatePCM}
          alertThreshold={report.alertThreshold}
          timelinePoints={report.timelinePoints}
          interceptSummary={report.interceptSummary}
        />

        {/* Cryptographic SHA-256 Enclave Record Footer */}
        <View style={styles.sha256FooterRow}>
          <SafeZoneShieldIcon size={12} color={Theme.colors.textMuted} />
          <Text style={styles.sha256Text}>
            Audio Fingerprint SHA-256: {report.sha256Fingerprint} • Cryptographically verified enclave record
          </Text>
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Button 1: Generate Evidence Pack */}
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.evidenceButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleEvidencePack}
          >
            <EvidencePackIcon size={16} color="#60A5FA" />
            <View style={styles.evidenceButtonContent}>
              <Text style={styles.evidenceButtonTitle}>Generate Evidence Pack</Text>
              <Text style={styles.evidenceButtonSubtitle}>
                (Audio Hash + Score Timeline PDF/WAV)
              </Text>
            </View>
          </Pressable>

          {/* Button 2: Back to Home */}
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.homeButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onBackToHome}
          >
            <HomeIcon size={16} color="#FFFFFF" />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </Pressable>
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
  topStatusRow: {
    alignItems: 'center',
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.xs,
  },
  threatArchivedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.full,
    gap: 5,
  },
  redDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EF4444',
  },
  threatArchivedText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#EF4444',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderDarkSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  docIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: Theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  zeroTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    gap: 5,
  },
  zeroTrustText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  callerSection: {
    alignItems: 'center',
    marginVertical: Theme.spacing.xs,
  },
  callerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  callerStats: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  sha256FooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
  },
  sha256Text: {
    fontSize: 9,
    fontWeight: '500',
    color: Theme.colors.textMuted,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 13,
  },
  actionsContainer: {
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  evidenceButton: {
    width: '100%',
    height: 52,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: Theme.spacing.md,
  },
  evidenceButtonContent: {
    alignItems: 'center',
  },
  evidenceButtonTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#60A5FA',
  },
  evidenceButtonSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  homeButton: {
    width: '100%',
    height: 52,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.verifiedBlue,
    borderWidth: 1,
    borderColor: '#60A5FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: Theme.colors.verifiedBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  homeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
