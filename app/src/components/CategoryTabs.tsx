import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';

export interface CategoryTabsProps {
  activeTab: 'official' | 'personal';
  officialCount: number;
  personalCount: number;
  onSelectTab: (tab: 'official' | 'personal') => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeTab,
  officialCount,
  personalCount,
  onSelectTab,
}: CategoryTabsProps) => {
  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.tab,
          activeTab === 'official' && styles.tabActive,
        ]}
        onPress={() => onSelectTab('official')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'official' && styles.tabTextActive,
          ]}
        >
          Official ({officialCount})
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.tab,
          activeTab === 'personal' && styles.tabActive,
        ]}
        onPress={() => onSelectTab('personal')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'personal' && styles.tabTextActive,
          ]}
        >
          Personal ({personalCount})
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 46,
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xs,
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.borderDarkSubtle,
  },
  tab: {
    flex: 1,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Theme.colors.verifiedBlue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
