import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';
import { TimelineChartIcon } from './Icons';
import { TimelinePoint } from '../mock/forensicData';

export interface VoiceTimelineCardProps {
  sampleRate?: string;
  alertThreshold?: number;
  timelinePoints: TimelinePoint[];
  interceptSummary: string;
}

export const VoiceTimelineCard: React.FC<VoiceTimelineCardProps> = ({
  sampleRate = '16kHz PCM',
  alertThreshold = 70,
  timelinePoints,
  interceptSummary,
}: VoiceTimelineCardProps) => {
  return (
    <View style={styles.card}>
      {/* Card Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleIconRow}>
            <TimelineChartIcon size={16} color="#60A5FA" />
            <Text style={styles.cardTitle}>Voice Authenticity Timeline</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            AI synthesis probability over call duration
          </Text>
        </View>

        <View style={styles.pcmBadge}>
          <Text style={styles.pcmText}>{sampleRate}</Text>
        </View>
      </View>

      {/* Visual Timeline Chart Representation */}
      <View style={styles.chartContainer}>
        {/* Risk Score Axis Labels */}
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>Risk Score</Text>
          <Text style={styles.axisLabelRight}>100%</Text>
        </View>

        {/* Dotted 70% Alert Threshold Line */}
        <View style={styles.thresholdLineContainer}>
          <View style={styles.dottedLine} />
          <View style={styles.thresholdBadge}>
            <Text style={styles.thresholdText}>{alertThreshold}% ALERT THRESHOLD</Text>
          </View>
        </View>

        {/* Visual Graph Curve Simulation */}
        <View style={styles.graphCurveBox}>
          {/* Simulated Gradient Curve Line */}
          <View style={styles.curveGreenSegment} />
          <View style={styles.curveYellowSegment} />
          <View style={styles.curveRedSegment} />

          {/* Key Milestone Data Nodes */}
          <View style={[styles.nodeDot, styles.node1]}>
            <View style={[styles.nodeInnerDot, { backgroundColor: Theme.colors.verifiedGreen }]} />
          </View>
          <View style={[styles.nodeDot, styles.node2]}>
            <View style={[styles.nodeInnerDot, { backgroundColor: '#F59E0B' }]} />
          </View>
          <View style={[styles.nodeDot, styles.node3]}>
            <View style={[styles.nodeInnerDot, { backgroundColor: '#EF4444' }]} />
          </View>
          <View style={[styles.nodeDot, styles.node4]}>
            <View style={[styles.nodeInnerDot, { backgroundColor: '#EF4444' }]} />
          </View>
        </View>

        {/* Timeline Timestamps Grid */}
        <View style={styles.timelineGrid}>
          {timelinePoints.map((point: TimelinePoint, idx: number) => (
            <View key={`time-pt-${idx}`} style={styles.timelineCol}>
              <Text style={styles.timestampText}>{point.time}</Text>
              <Text
                style={[
                  styles.timelineLabel,
                  idx === 0
                    ? styles.textGreen
                    : idx === 1
                    ? styles.textAmber
                    : styles.textRed,
                ]}
              >
                {point.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Intercept Summary Callout Log Box */}
      <View style={styles.summaryCalloutBox}>
        <View style={styles.redStatusDot} />
        <Text style={styles.summaryCalloutText}>{interceptSummary}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.md,
    marginVertical: Theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  pcmBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
  },
  pcmText: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  chartContainer: {
    paddingVertical: Theme.spacing.xs,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  axisLabelRight: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textMuted,
  },
  thresholdLineContainer: {
    position: 'relative',
    marginVertical: 12,
  },
  dottedLine: {
    width: '100%',
    height: 1,
    borderWidth: 0.8,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderStyle: 'dashed',
  },
  thresholdBadge: {
    position: 'absolute',
    right: 8,
    top: -9,
    backgroundColor: 'rgba(127, 29, 29, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  thresholdText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.5,
  },
  graphCurveBox: {
    height: 70,
    width: '100%',
    position: 'relative',
    marginVertical: 10,
    justifyContent: 'flex-end',
  },
  curveGreenSegment: {
    position: 'absolute',
    left: 0,
    bottom: 10,
    width: '30%',
    height: 4,
    backgroundColor: Theme.colors.verifiedGreen,
    borderRadius: 2,
  },
  curveYellowSegment: {
    position: 'absolute',
    left: '28%',
    bottom: 25,
    width: '32%',
    height: 4,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
    transform: [{ rotate: '-18deg' }],
  },
  curveRedSegment: {
    position: 'absolute',
    left: '56%',
    bottom: 50,
    width: '42%',
    height: 5,
    backgroundColor: '#EF4444',
    borderRadius: 2,
    transform: [{ rotate: '-12deg' }],
  },
  nodeDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  node1: { left: '3%', bottom: 4 },
  node2: { left: '33%', bottom: 20 },
  node3: { left: '60%', bottom: 44 },
  node4: { right: '3%', bottom: 58 },
  nodeInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderDarkSubtle,
    paddingTop: Theme.spacing.xs,
  },
  timelineCol: {
    alignItems: 'center',
  },
  timestampText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    fontFamily: 'monospace',
  },
  timelineLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  textGreen: { color: Theme.colors.verifiedGreen },
  textAmber: { color: '#F59E0B' },
  textRed: { color: '#EF4444' },
  summaryCalloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
    padding: Theme.spacing.sm + 2,
    gap: 8,
    marginTop: Theme.spacing.sm,
  },
  redStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginTop: 4,
  },
  summaryCalloutText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    lineHeight: 16,
  },
});
