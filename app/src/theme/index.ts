export const Theme = {
  colors: {
    // Core dark enclave palette
    bgDark: '#0B0F17',
    surfaceDark: '#131926',
    surfaceDarkElevated: '#192033',
    cardDark: '#1A2234',
    borderDark: '#232E47',
    borderDarkSubtle: '#1C2538',

    // Verified State (State 1) - Emerald & Vibrant Enclave Blue
    verifiedGreen: '#10B981',
    verifiedGreenGlow: 'rgba(16, 185, 129, 0.15)',
    verifiedGreenBorder: '#059669',
    verifiedBlue: '#2563EB',
    verifiedBlueBright: '#3B82F6',
    verifiedBlueGlow: 'rgba(37, 99, 235, 0.35)',
    verifiedBlueText: '#FFFFFF',

    // Unverified / Unenrolled State (State 2) - Amber & Dark Muted
    unverifiedAmber: '#F59E0B',
    unverifiedAmberGlow: 'rgba(245, 158, 11, 0.15)',
    unverifiedAmberBorder: 'rgba(245, 158, 11, 0.4)',
    unverifiedBadgeBg: '#2D2316',
    unverifiedBadgeText: '#F59E0B',
    unverifiedButtonBg: '#131A29',
    unverifiedButtonBorder: '#232E47',
    unverifiedButtonText: '#9CA3AF',

    // Typography & System
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accentCyan: '#06B6D4',
    
    // Keypad Specific
    keypadBg: '#131926',
    keypadPressedBg: '#1E273A',
    keypadBorder: '#1F293D',
    keypadNumberText: '#FFFFFF',
    keypadSubtext: '#64748B',
    keypadSubtextAccent: '#06B6D4',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  typography: {
    numberDisplay: {
      fontSize: 32,
      fontWeight: '700' as const,
      letterSpacing: 1.5,
    },
    title: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    keypadNumber: {
      fontSize: 26,
      fontWeight: '600' as const,
    },
    keypadSubtext: {
      fontSize: 9,
      fontWeight: '700' as const,
      letterSpacing: 0.8,
    },
    caption: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
  },
} as const;

export type AppTheme = typeof Theme;
