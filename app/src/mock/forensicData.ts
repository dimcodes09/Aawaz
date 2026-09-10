/**
 * Mock dataset for AAWAZ Post-Call Forensic Session & RAW-TFNet Logits Report
 * // TODO(UI): expects post-call acoustic timeline payload & RAW-TFNet logits from Track 1 (ML)
 */

export interface TimelinePoint {
  time: string;
  label: string;
  riskScore: number;
}

export interface ForensicReport {
  sessionId: string;
  contactName: string;
  duration: string;
  endedAt: string;
  peakRiskScore: number;
  acousticMatchPercent: number;
  vocoderAnomaly: string;
  vocoderSubtext: string;
  acousticJitter: string;
  jitterSubtext: string;
  sampleRatePCM: string;
  alertThreshold: number;
  timelinePoints: TimelinePoint[];
  interceptSummary: string;
  sha256Fingerprint: string;
}

export const MOCK_FORENSIC_REPORT: ForensicReport = {
  sessionId: '#AWZ-9042-X',
  contactName: 'HDFC Priority Support (Claimed)',
  duration: '05m 14s',
  endedAt: '09:44 AM',
  peakRiskScore: 88,
  acousticMatchPercent: 14.2,
  vocoderAnomaly: 'POSITIVE',
  vocoderSubtext: 'Neural Artifacts',
  acousticJitter: 'Abnormal',
  jitterSubtext: 'Flat Pitch',
  sampleRatePCM: '16kHz PCM',
  alertThreshold: 70,
  timelinePoints: [
    { time: '00:00', label: '0% Normal', riskScore: 10 },
    { time: '01:42', label: 'Vocoder Spike', riskScore: 48 },
    { time: '03:30', label: 'Pattern Lock', riskScore: 72 },
    { time: '05:14', label: '88% Peak', riskScore: 88 },
  ],
  interceptSummary:
    'Synthetic voice patterns detected at 1:42 — anomalous acoustic jitter and synthetic vocoder patterns intercepted.',
  sha256Fingerprint: '8f4b...c912',
};
