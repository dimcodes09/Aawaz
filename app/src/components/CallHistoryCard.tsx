import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import { IncomingCallIcon, OutgoingCallIcon, ChevronRightIcon } from './Icons';
import { CallSession } from '../mock/callHistoryData';

export interface CallHistoryCardProps {
  sessions: CallSession[];
  onPressSession?: (session: CallSession) => void;
  onPressEnclaveLog?: () => void;
}

export const CallHistoryCard: React.FC<CallHistoryCardProps> = ({
  sessions,
  onPressSession,
  onPressEnclaveLog,
}: CallHistoryCardProps) => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.sectionTitle}>CALL HISTORY</Text>
          <View style={styles.sessionCountBadge}>
            <Text style={styles.sessionCountText}>
              {sessions.length} Sessions
            </Text>
          </View>
        </View>

        <Pressable onPress={onPressEnclaveLog} hitSlop={8}>
          <Text style={styles.enclaveLogLink}>Enclave Log</Text>
        </Pressable>
      </View>

      {/* Main Card Container */}
      <View style={styles.card}>
        {sessions.map((session: CallSession, index: number) => {
          const isIncoming = session.type === 'incoming';
          const isRisk = session.status === 'risk';

          return (
            <Pressable
              key={session.id}
              style={({ pressed }: { pressed: boolean }) => [
                styles.sessionRow,
                index < sessions.length - 1 && styles.rowBorder,
                pressed && styles.rowPressed,
              ]}
              onPress={() => onPressSession && onPressSession(session)}
            >
              {/* Directional Circle Icon */}
              <View
                style={[
                  styles.arrowCircle,
                  isRisk ? styles.arrowCircleRisk : styles.arrowCircleNormal,
                ]}
              >
                {isIncoming ? (
                  <IncomingCallIcon
                    color={isRisk ? '#EF4444' : Theme.colors.textSecondary}
                    size={14}
                  />
                ) : (
                  <OutgoingCallIcon color="#3B82F6" size={14} />
                )}
              </View>

              {/* Call Session Info */}
              <View style={styles.sessionInfo}>
                <View style={styles.titleBadgeRow}>
                  <Text style={styles.sessionTitle}>
                    {isIncoming ? 'Incoming Call' : 'Outgoing Call'}
                  </Text>
                  {session.intercepted ? (
                    <View style={styles.interceptedBadge}>
                      <Text style={styles.interceptedText}>Intercepted</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.sessionSubtitle}>
                  {session.timestamp} • {session.duration}
                </Text>
              </View>

              {/* Right Risk/Safe Status Pill */}
              <View
                style={[
                  styles.statusPill,
                  isRisk ? styles.statusPillRisk : styles.statusPillSafe,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isRisk ? '#EF4444' : Theme.colors.verifiedGreen },
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    isRisk ? styles.statusPillTextRisk : styles.statusPillTextSafe,
                  ]}
                >
                  {isRisk ? 'Risk Detected' : `Safe (${session.riskScore}%)`}
                </Text>
              </View>

              <ChevronRightIcon size={14} color={Theme.colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Theme.colors.textSecondary,
  },
  sessionCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
  },
  sessionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textMuted,
  },
  enclaveLogLink: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.verifiedBlueBright,
  },
  card: {
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderDarkSubtle,
  },
  rowPressed: {
    backgroundColor: Theme.colors.surfaceDarkElevated,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircleRisk: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  arrowCircleNormal: {
    backgroundColor: Theme.colors.cardDark,
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
  },
  sessionInfo: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  interceptedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.borderRadius.sm,
  },
  interceptedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  sessionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  statusPillRisk: {
    backgroundColor: 'rgba(153, 27, 27, 0.3)',
    borderColor: '#991B1B',
  },
  statusPillSafe: {
    backgroundColor: Theme.colors.verifiedGreenGlow,
    borderColor: Theme.colors.verifiedGreenBorder,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextRisk: {
    color: '#F87171',
  },
  statusPillTextSafe: {
    color: Theme.colors.verifiedGreen,
  },
});
