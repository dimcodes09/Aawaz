import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import {
  DialerNavIcon,
  ContactsNavIcon,
  ScansNavIcon,
  SettingsNavIcon,
} from './Icons';

export type NavTab = 'dialer' | 'contacts' | 'scans' | 'settings' | 'vault';

export interface BottomNavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onPressDialer: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onPressDialer,
}: BottomNavBarProps) => {
  return (
    <View style={styles.outerWrapper}>
      {/* Main Bottom Bar */}
      <View style={styles.navBar}>
        {/* Tab 1: Dialer (Left-most) */}
        <Pressable
          style={styles.navItem}
          onPress={() => {
            onSelectTab('dialer');
            onPressDialer();
          }}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
        >
          <DialerNavIcon active={activeTab === 'dialer'} size={18} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'dialer' && styles.navLabelActive,
            ]}
          >
            Dialer
          </Text>
        </Pressable>

        {/* Tab 2: Contacts */}
        <Pressable
          style={styles.navItem}
          onPress={() => onSelectTab('contacts')}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
        >
          <ContactsNavIcon active={activeTab === 'contacts'} size={18} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'contacts' && styles.navLabelActive,
            ]}
          >
            Contacts
          </Text>
        </Pressable>

        {/* Tab 3: Scans */}
        <Pressable
          style={styles.navItem}
          onPress={() => onSelectTab('scans')}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
        >
          <ScansNavIcon active={activeTab === 'scans'} size={18} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'scans' && styles.navLabelActive,
            ]}
          >
            Scans
          </Text>
        </Pressable>

        {/* Tab 4: Settings */}
        <Pressable
          style={styles.navItem}
          onPress={() => onSelectTab('settings')}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
        >
          <SettingsNavIcon active={activeTab === 'settings'} size={18} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'settings' && styles.navLabelActive,
            ]}
          >
            Settings
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    width: '100%',
    backgroundColor: Theme.colors.bgDark,
  },
  navBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Theme.colors.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderDark,
    paddingHorizontal: Theme.spacing.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  navLabelActive: {
    color: Theme.colors.verifiedBlueBright,
    fontWeight: '700',
  },
});
