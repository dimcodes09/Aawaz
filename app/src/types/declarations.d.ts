/**
 * Ambient type declarations for AAWAZ UI presentation layer
 * Provides module types for React & React Native primitives when node_modules is pending installation.
 */

declare module 'react' {
  export const useState: <T>(initialState: T | (() => T)) => [T, (newState: T | ((prev: T) => T)) => void];
  export const useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
  export const useMemo: <T>(factory: () => T, deps: any[]) => T;
  export type FC<P = {}> = (props: P) => any;
  export type ReactNode = any;
  export default any;
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const StyleSheet: any;
  export const Pressable: any;
  export const TouchableOpacity: any;
  export const ScrollView: any;
  export const FlatList: any;
  export const StatusBar: any;
  export const Modal: any;
  export const Alert: any;
  export const TextInput: any;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaProvider: any;
  export const SafeAreaView: any;
  export const useSafeAreaInsets: any;
}
