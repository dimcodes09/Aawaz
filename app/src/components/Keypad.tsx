import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import { BackspaceIcon } from './Icons';

export interface KeypadProps {
  onPressDigit: (digit: string) => void;
  onPressBackspace: () => void;
  onLongPressBackspace?: () => void;
}

export interface KeyConfig {
  digit: string;
  subtext: string;
  isAccentSubtext?: boolean;
}

const KEYPAD_KEYS: KeyConfig[][] = [
  [
    { digit: '1', subtext: 'VOICE ID', isAccentSubtext: true },
    { digit: '2', subtext: 'ABC' },
    { digit: '3', subtext: 'DEF' },
  ],
  [
    { digit: '4', subtext: 'GHI' },
    { digit: '5', subtext: 'JKL' },
    { digit: '6', subtext: 'MNO' },
  ],
  [
    { digit: '7', subtext: 'PQRS' },
    { digit: '8', subtext: 'TUV' },
    { digit: '9', subtext: 'WXYZ' },
  ],
  [
    { digit: '*', subtext: '' },
    { digit: '0', subtext: '+' },
    { digit: 'backspace', subtext: '' },
  ],
];

export const Keypad: React.FC<KeypadProps> = ({
  onPressDigit,
  onPressBackspace,
  onLongPressBackspace,
}: KeypadProps) => {
  const handlePress = (key: KeyConfig): void => {
    if (key.digit === 'backspace') {
      onPressBackspace();
    } else {
      onPressDigit(key.digit);
    }
  };

  const handleLongPress = (key: KeyConfig): void => {
    if (key.digit === 'backspace' && onLongPressBackspace) {
      onLongPressBackspace();
    } else if (key.digit === '0') {
      onPressDigit('+');
    }
  };

  return (
    <View style={styles.container}>
      {KEYPAD_KEYS.map((row: KeyConfig[], rowIndex: number) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((key: KeyConfig) => {
            const isBackspace = key.digit === 'backspace';

            return (
              <Pressable
                key={key.digit}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.keyButton,
                  pressed && styles.keyButtonPressed,
                ]}
                onPress={() => handlePress(key)}
                onLongPress={() => handleLongPress(key)}
                delayLongPress={400}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
              >
                {isBackspace ? (
                  <BackspaceIcon color={Theme.colors.textPrimary} size={22} />
                ) : (
                  <View style={styles.keyContent}>
                    <Text style={styles.digitText}>{key.digit}</Text>
                    {key.subtext ? (
                      <Text
                        style={[
                          styles.subtext,
                          key.isAccentSubtext && styles.accentSubtext,
                        ]}
                      >
                        {key.subtext}
                      </Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
  },
  keyButton: {
    flex: 1,
    height: 64,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.keypadBg,
    borderWidth: 1,
    borderColor: Theme.colors.keypadBorder,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  keyButtonPressed: {
    backgroundColor: Theme.colors.keypadPressedBg,
    borderColor: Theme.colors.borderDark,
    transform: [{ scale: 0.96 }],
  },
  keyContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: Theme.typography.keypadNumber.fontSize,
    fontWeight: Theme.typography.keypadNumber.fontWeight,
    color: Theme.colors.keypadNumberText,
    lineHeight: 30,
  },
  subtext: {
    fontSize: Theme.typography.keypadSubtext.fontSize,
    fontWeight: Theme.typography.keypadSubtext.fontWeight,
    letterSpacing: Theme.typography.keypadSubtext.letterSpacing,
    color: Theme.colors.keypadSubtext,
    marginTop: 1,
  },
  accentSubtext: {
    color: Theme.colors.accentCyan,
  },
});
