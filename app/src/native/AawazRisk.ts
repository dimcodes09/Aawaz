import { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, NativeModules } from 'react-native';
import type { EmitterSubscription } from 'react-native';

/**
 * Bridge to the Track 1 native detector.
 *
 * Frozen contract (docs/CONTRACTS.md):
 *   DeviceEventEmitter event "AawazRisk"
 *   payload { score: Int 0-100, state: String, ts: Long }
 *   emitted at 1 Hz, state "ANALYSING" until a full 4.04 s window exists.
 *
 * Audio never crosses the bridge. Only the score does.
 */

export const AAWAZ_RISK_EVENT = 'AawazRisk';

export type AawazRiskState = 'ANALYSING' | 'OK' | 'ELEVATED' | 'HIGH';

export interface AawazRiskEvent {
  score: number;
  state: AawazRiskState;
  ts: number;
}

interface DetectorBridgeModule {
  startModeA: () => Promise<boolean>;
  stopModeA: () => Promise<boolean>;
  getMedianLatencyMs: () => Promise<number>;
  playDemoClip: (kind: string) => Promise<boolean>;
  getMediaVolumePercent: () => Promise<number>;
  startMicDetection: () => Promise<boolean>;
  stopMicDetection: () => Promise<boolean>;
  startRecording: () => Promise<boolean>;
  analyzeRecording: () => Promise<number>;
}

const bridge: DetectorBridgeModule | undefined = (
  NativeModules as { DetectorBridge?: DetectorBridgeModule }
).DetectorBridge;

export const isDetectorAvailable = (): boolean => bridge != null;

export const startModeA = async (): Promise<boolean> => {
  if (!bridge) {
    console.warn('[AawazRisk] DetectorBridge native module not found');
    return false;
  }
  return bridge.startModeA();
};

export const stopModeA = async (): Promise<boolean> => {
  if (!bridge) return false;
  return bridge.stopModeA();
};

/**
 * Judge demo: plays a validated clip out loud AND scores that same audio with
 * the existing detector. The verdict arrives on the normal AawazRisk event.
 */
export const playDemoClip = async (kind: 'real' | 'fake'): Promise<boolean> => {
  if (!bridge) {
    console.warn('[AawazRisk] DetectorBridge not available for demo playback');
    return false;
  }
  try {
    const started = await bridge.playDemoClip(kind);
    const vol = await bridge.getMediaVolumePercent();
    console.log(`[AawazRisk] playDemoClip(${kind}) -> ${started}, media volume ${vol}%`);
    if (vol === 0) {
      console.warn('[AawazRisk] media volume is 0 - judges will not hear the clip');
    }
    return started;
  } catch (err) {
    console.warn(`[AawazRisk] playDemoClip failed: ${String(err)}`);
    return false;
  }
};

/** Live mic into the existing detector. Nothing is recorded to disk. */
export const startMicDetection = async (): Promise<boolean> => {
  if (!bridge) return false;
  try {
    const ok = await bridge.startMicDetection();
    console.log(`[AawazRisk] startMicDetection -> ${ok}`);
    return ok;
  } catch (err) {
    console.warn(`[AawazRisk] startMicDetection failed: ${String(err)}`);
    return false;
  }
};

export const stopMicDetection = async (): Promise<boolean> => {
  if (!bridge) return false;
  try {
    return await bridge.stopMicDetection();
  } catch {
    return false;
  }
};

/** Utterance capture: record, then score once. Nothing is stored on disk. */
export const startRecording = async (): Promise<boolean> => {
  if (!bridge) return false;
  try {
    return await bridge.startRecording();
  } catch {
    return false;
  }
};

/** Returns seconds analysed, or -1 if too short (<4.05 s) to score. */
export const analyzeRecording = async (): Promise<number> => {
  if (!bridge) return -1;
  try {
    const secs = await bridge.analyzeRecording();
    console.log(`[AawazRisk] analyzeRecording -> ${secs}s`);
    return secs;
  } catch (err) {
    console.warn(`[AawazRisk] analyzeRecording failed: ${String(err)}`);
    return -1;
  }
};

/** Raw subscription, for callers that do not want the hook. */
export const subscribeToRisk = (
  onRisk: (event: AawazRiskEvent) => void,
): EmitterSubscription =>
  DeviceEventEmitter.addListener(AAWAZ_RISK_EVENT, onRisk);

/**
 * Subscribes to the native risk stream for as long as the component is mounted,
 * starting the detector on mount and stopping it on unmount.
 *
 * Until the first event arrives the reading is ANALYSING / 0, which matches what
 * the native side emits before a full window exists.
 */
export const useAawazRisk = (
  enabled: boolean = true,
): { risk: AawazRiskEvent; eventCount: number } => {
  const [risk, setRisk] = useState<AawazRiskEvent>({
    score: 0,
    state: 'ANALYSING',
    ts: 0,
  });
  const [eventCount, setEventCount] = useState<number>(0);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const subscription = subscribeToRisk((event: AawazRiskEvent) => {
      setRisk(event);
      setEventCount((prev: number) => prev + 1);
    });

    startModeA()
      .then((ok: boolean) => {
        startedRef.current = ok;
        console.log(`[AawazRisk] startModeA -> ${ok}`);
      })
      .catch((err: unknown) => {
        console.warn(`[AawazRisk] startModeA failed: ${String(err)}`);
      });

    return () => {
      subscription.remove();
      if (startedRef.current) {
        stopModeA().catch(() => {});
        startedRef.current = false;
      }
    };
  }, [enabled]);

  return { risk, eventCount };
};
