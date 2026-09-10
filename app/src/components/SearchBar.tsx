import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../theme';
import { SearchIcon, FilterIcon } from './Icons';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onPressFilter?: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onPressFilter,
  placeholder = 'Search verified contacts',
}: SearchBarProps) => {
  return (
    <View style={styles.container}>
      <SearchIcon size={16} color={Theme.colors.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Theme.colors.textMuted}
        selectionColor={Theme.colors.verifiedBlue}
      />
      {onPressFilter ? (
        <Pressable
          style={styles.filterButton}
          onPress={onPressFilter}
          hitSlop={8}
        >
          <FilterIcon size={16} color={Theme.colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceDark,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.sm,
    marginHorizontal: Theme.spacing.lg,
    marginVertical: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.textPrimary,
    paddingVertical: 0,
  },
  filterButton: {
    padding: Theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
