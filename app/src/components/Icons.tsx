import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';

interface IconProps {
  color?: string;
  size?: number;
}

export const ShieldIcon: React.FC<IconProps> = ({ color = Theme.colors.verifiedGreen, size = 18 }) => {
  return (
    <View style={[styles.shieldContainer, { width: size, height: size * 1.1 }]}>
      <View style={[styles.shieldTop, { borderColor: color }]} />
      <View style={styles.shieldBody}>
        <Text style={{ color, fontSize: size * 0.55, fontWeight: 'bold' }}>✓</Text>
      </View>
    </View>
  );
};

export const SafeZoneShieldIcon: React.FC<IconProps> = ({ color = Theme.colors.verifiedGreen, size = 14 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.9 }}>🛡️</Text>
    </View>
  );
};

export const PhoneIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 18 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.85,
          height: size * 0.85,
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '-35deg' }, { translateY: size * 0.12 }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: -size * 0.02,
            left: -size * 0.02,
            width: size * 0.42,
            height: size * 0.32,
            borderRadius: size * 0.16,
            backgroundColor: color,
            transform: [{ rotate: '-25deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -size * 0.02,
            right: -size * 0.02,
            width: size * 0.42,
            height: size * 0.32,
            borderRadius: size * 0.16,
            backgroundColor: color,
            transform: [{ rotate: '-25deg' }],
          }}
        />
        <View
          style={{
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size * 0.36,
            borderBottomWidth: Math.max(4, size * 0.26),
            borderLeftWidth: Math.max(4, size * 0.26),
            borderColor: color,
            borderTopWidth: 0,
            borderRightWidth: 0,
          }}
        />
      </View>
    </View>
  );
};

export const PhoneHangupIcon: React.FC<IconProps> = ({ color = '#FFFFFF', size = 22 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ rotate: '135deg' }] }}>
        <PhoneIcon color={color} size={size} />
      </View>
    </View>
  );
};

export const ChevronDownIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 18 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.4,
          height: size * 0.4,
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginTop: -size * 0.15,
        }}
      />
    </View>
  );
};


export const BackspaceIcon: React.FC<IconProps> = ({ color = Theme.colors.textSecondary, size = 22 }) => {
  return (
    <View style={[styles.backspaceContainer, { width: size * 1.3, height: size }]}>
      <View style={[styles.backspaceArrow, { borderRightColor: Theme.colors.surfaceDarkElevated }]} />
      <View style={[styles.backspaceBox, { borderColor: color }]}>
        <Text style={[styles.backspaceX, { color }]}>✕</Text>
      </View>
    </View>
  );
};

export const LockIcon: React.FC<IconProps> = ({ color = Theme.colors.textMuted, size = 14 }) => {
  return (
    <View style={{ width: size, height: size * 1.2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.8 }}>🔒</Text>
    </View>
  );
};

export const ArrowLeftIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 20 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 1.1, fontWeight: '600' }}>←</Text>
    </View>
  );
};

export const Signal5GIcon: React.FC<{ isSecure?: boolean }> = ({ isSecure = true }) => {
  const color = isSecure ? Theme.colors.verifiedGreen : Theme.colors.textMuted;
  return (
    <View style={styles.signalBadge}>
      <Text style={[styles.signalText, { color }]}>
        {isSecure ? '5G SECURE' : '5G STANDARD'}
      </Text>
      <View style={[styles.lockIndicator, { backgroundColor: isSecure ? Theme.colors.verifiedGreen : Theme.colors.textMuted }]} />
    </View>
  );
};

export const StatusDot: React.FC<{ active?: boolean; isVerified?: boolean }> = ({ active = true, isVerified = true }) => {
  const bgColor = !active
    ? Theme.colors.textMuted
    : isVerified
    ? Theme.colors.verifiedGreen
    : Theme.colors.unverifiedAmber;

  return (
    <View style={[styles.statusDotOuter, { borderColor: bgColor }]}>
      <View style={[styles.statusDotInner, { backgroundColor: bgColor }]} />
    </View>
  );
};

// Search & Filter Icons
export const SearchIcon: React.FC<IconProps> = ({ color = Theme.colors.textMuted, size = 16 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.9 }}>🔍</Text>
    </View>
  );
};

export const FilterIcon: React.FC<IconProps> = ({ color = Theme.colors.textMuted, size = 16 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.9 }}>⚡</Text>
    </View>
  );
};

// Category Avatar Icons
export const AdminIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <Text style={{ fontSize: size }}>🏢</Text>
);

export const TaxIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <Text style={{ fontSize: size }}>🏛️</Text>
);

export const CyberIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <Text style={{ fontSize: size }}>🛡️</Text>
);

export const BankIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <Text style={{ fontSize: size }}>🏦</Text>
);

export const HospitalIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <Text style={{ fontSize: size }}>🏥</Text>
);

export const PersonIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <Text style={{ fontSize: size }}>👤</Text>
);

// Dossier & Action Icons
export const MessageIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
    <View
      style={{
        width: size * 0.85,
        height: size * 0.65,
        borderRadius: size * 0.25,
        borderWidth: Math.max(1.8, size * 0.1),
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: size * 0.08,
      }}
    >
      <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
    </View>
    <View
      style={{
        position: 'absolute',
        bottom: size * 0.08,
        left: size * 0.2,
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.12,
        borderLeftColor: 'transparent',
        borderRightWidth: size * 0.12,
        borderRightColor: 'transparent',
        borderTopWidth: size * 0.16,
        borderTopColor: color,
      }}
    />
  </View>
);

export const SecurityActionIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View
      style={{
        width: size * 0.75,
        height: size * 0.85,
        borderWidth: Math.max(1.8, size * 0.1),
        borderColor: color,
        borderBottomLeftRadius: size * 0.35,
        borderBottomRightRadius: size * 0.35,
        borderTopLeftRadius: size * 0.1,
        borderTopRightRadius: size * 0.1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.45, fontWeight: '900', marginTop: -2 }}>✓</Text>
    </View>
  </View>
);

export const MoreOptionsIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.9, fontWeight: 'bold' }}>•••</Text>
  </View>
);

export const IncomingCallIcon: React.FC<IconProps> = ({ color = '#EF4444', size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
    <View style={{ width: 2, height: size * 0.65, backgroundColor: color, position: 'absolute' }} />
    <View
      style={{
        width: size * 0.4,
        height: size * 0.4,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        bottom: size * 0.1,
      }}
    />
  </View>
);

export const OutgoingCallIcon: React.FC<IconProps> = ({ color = '#3B82F6', size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
    <View style={{ width: 2, height: size * 0.65, backgroundColor: color, position: 'absolute' }} />
    <View
      style={{
        width: size * 0.4,
        height: size * 0.4,
        borderLeftWidth: 2,
        borderTopWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        top: size * 0.1,
      }}
    />
  </View>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ color = Theme.colors.textMuted, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 1.1, fontWeight: 'bold' }}>›</Text>
  </View>
);

export const WaveformIcon: React.FC<IconProps & { isAlert?: boolean }> = ({
  color = Theme.colors.verifiedGreen,
  size = 14,
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2.5, height: size }}>
    <View style={{ width: 2, height: size * 0.45, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ width: 2, height: size * 0.9, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ width: 2, height: size * 0.6, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ width: 2, height: size * 0.75, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

export const FingerprintIcon: React.FC<IconProps> = ({ color = '#60A5FA', size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.95 }}>🆔</Text>
  </View>
);

export const ClockIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.95 }}>⏰</Text>
  </View>
);

// Forensic Summary Specific Icons
export const DocumentIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.95 }}>📄</Text>
  </View>
);

export const TimelineChartIcon: React.FC<IconProps> = ({ color = '#60A5FA', size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.95 }}>📈</Text>
  </View>
);

export const EvidencePackIcon: React.FC<IconProps> = ({ color = '#60A5FA', size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.95 }}>🎵</Text>
  </View>
);

export const HomeIcon: React.FC<IconProps> = ({ color = '#FFFFFF', size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.95 }}>🏠</Text>
  </View>
);

// Permission Primer Icons
export const MicIcon: React.FC<IconProps & { muted?: boolean }> = ({
  color = Theme.colors.textPrimary,
  size = 22,
  muted = false,
}) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <View
        style={{
          width: size * 0.36,
          height: size * 0.54,
          borderRadius: size * 0.18,
          backgroundColor: color,
          marginBottom: size * 0.08,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.2,
          width: size * 0.62,
          height: size * 0.42,
          borderBottomLeftRadius: size * 0.31,
          borderBottomRightRadius: size * 0.31,
          borderWidth: Math.max(1.8, size * 0.08),
          borderColor: color,
          borderTopWidth: 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.1,
          width: Math.max(1.8, size * 0.08),
          height: size * 0.18,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.06,
          width: size * 0.42,
          height: Math.max(1.8, size * 0.08),
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      {muted && (
        <View
          style={{
            position: 'absolute',
            width: size * 0.85,
            height: 2.5,
            backgroundColor: '#EF4444',
            borderRadius: 1.5,
            transform: [{ rotate: '-45deg' }],
          }}
        />
      )}
    </View>
  );
};

export const KeypadIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 22 }) => {
  const dotSize = Math.max(3.5, size * 0.16);
  const gap = Math.max(3, size * 0.13);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'column', gap }}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap }}>
            {[0, 1, 2].map((col) => (
              <View
                key={col}
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: color,
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

export const SpeakerIcon: React.FC<IconProps & { active?: boolean }> = ({
  color = Theme.colors.textPrimary,
  size = 22,
  active = false,
}) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.85, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.06,
            width: size * 0.22,
            height: size * 0.3,
            backgroundColor: color,
            borderTopLeftRadius: 2,
            borderBottomLeftRadius: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.22,
            width: 0,
            height: 0,
            borderTopWidth: size * 0.22,
            borderTopColor: 'transparent',
            borderBottomWidth: size * 0.22,
            borderBottomColor: 'transparent',
            borderRightWidth: size * 0.28,
            borderRightColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: size * 0.12,
            width: size * 0.2,
            height: size * 0.38,
            borderRightWidth: 2,
            borderTopWidth: 2,
            borderBottomWidth: 2,
            borderLeftWidth: 0,
            borderColor: color,
            borderRadius: size * 0.19,
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: 0,
            width: size * 0.32,
            height: size * 0.58,
            borderRightWidth: 2,
            borderTopWidth: 2,
            borderBottomWidth: 2,
            borderLeftWidth: 0,
            borderColor: active ? color : 'rgba(255, 255, 255, 0.3)',
            borderRadius: size * 0.29,
          }}
        />
      </View>
    </View>
  );
};

export const BellIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 32 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.9 }}>🔔</Text>
  </View>
);

export const PeopleIcon: React.FC<IconProps> = ({ color = Theme.colors.textPrimary, size = 32 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.9 }}>👥</Text>
  </View>
);

export const WarningShieldIcon: React.FC<IconProps> = ({ color = '#EF4444', size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.9 }}>⚠️</Text>
  </View>
);

// Floating Action Button & Keypad Icon
export const KeypadFabIcon: React.FC<IconProps> = ({ color = '#FFFFFF', size = 24 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.95, fontWeight: 'bold' }}>⌨️</Text>
  </View>
);

export const PlusIcon: React.FC<IconProps> = ({ color = '#FFFFFF', size = 22 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 1.1, fontWeight: 'bold' }}>+</Text>
  </View>
);

// Bottom Navigation Icons
export const DialerNavIcon: React.FC<{ active?: boolean; size?: number }> = ({ active = false, size = 20 }) => {
  const color = active ? '#60A5FA' : '#94A3B8';
  return <KeypadIcon color={color} size={size} />;
};

export const ContactsNavIcon: React.FC<{ active?: boolean; size?: number }> = ({ active = false, size = 20 }) => {
  const color = active ? '#60A5FA' : '#94A3B8';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.7,
          height: size * 0.8,
          borderWidth: 1.8,
          borderColor: color,
          borderBottomLeftRadius: size * 0.35,
          borderBottomRightRadius: size * 0.35,
          borderTopLeftRadius: size * 0.1,
          borderTopRightRadius: size * 0.1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color, fontSize: size * 0.4, fontWeight: '900' }}>✓</Text>
      </View>
    </View>
  );
};

export const ScansNavIcon: React.FC<{ active?: boolean; size?: number }> = ({ active = false, size = 20 }) => {
  const color = active ? '#60A5FA' : '#94A3B8';
  return <WaveformIcon color={color} size={size * 0.8} />;
};

export const VaultNavIcon: React.FC<{ active?: boolean; size?: number }> = ({ active = false, size = 20 }) => {
  const color = active ? '#60A5FA' : '#94A3B8';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.4, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
};

export const SettingsNavIcon: React.FC<{ active?: boolean; size?: number }> = ({ active = false, size = 20 }) => {
  const color = active ? '#60A5FA' : '#94A3B8';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.65,
          height: size * 0.65,
          borderRadius: size * 0.325,
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11, backgroundColor: color }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shieldTop: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderWidth: 1.8,
    position: 'absolute',
  },
  shieldBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  backspaceBox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceX: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    gap: 5,
  },
  signalText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lockIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOuter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  statusDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
