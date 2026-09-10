import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Theme } from '../theme';
import { SafeZoneShieldIcon } from '../components/Icons';
import { CategoryTabs } from '../components/CategoryTabs';
import { SearchBar } from '../components/SearchBar';
import { ContactCard } from '../components/ContactCard';
import { BottomNavBar, NavTab } from '../components/BottomNavBar';
import {
  MOCK_OFFICIAL_CONTACTS,
  MOCK_PERSONAL_CONTACTS,
  Contact,
} from '../mock/contactsData';

export interface ContactListScreenProps {
  onOpenDialer: () => void;
  onSelectContact?: (contact: Contact) => void;
  onInitiateCall?: (phoneNumber: string, isVerified: boolean) => void;
}

export const ContactListScreen: React.FC<ContactListScreenProps> = ({
  onOpenDialer,
  onSelectContact,
  onInitiateCall,
}: ContactListScreenProps) => {
  const [activeCategory, setActiveCategory] = useState<'official' | 'personal'>('official');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('contacts');

  // Filter contacts by tab and search input
  const filteredContacts = useMemo(() => {
    const dataset =
      activeCategory === 'official' ? MOCK_OFFICIAL_CONTACTS : MOCK_PERSONAL_CONTACTS;

    if (!searchQuery.trim()) {
      return dataset;
    }

    const query = searchQuery.toLowerCase();
    return dataset.filter(
      (c: Contact) =>
        c.name.toLowerCase().includes(query) ||
        c.subtitle.toLowerCase().includes(query) ||
        c.badgeTag.toLowerCase().includes(query)
    );
  }, [activeCategory, searchQuery]);

  const handleCallContact = (contact: Contact): void => {
    if (onInitiateCall) {
      onInitiateCall(contact.phoneNumber, contact.isVerified);
    } else {
      Alert.alert(
        '🛡️ AAWAZ Verified Channel',
        `Calling ${contact.name}\nNumber: ${contact.phoneNumber}\nProtection: 256-bit Enclave Voiceprint Active`
      );
    }
  };

  const handleSelectNavTab = (tab: NavTab): void => {
    if (tab === 'dialer') {
      onOpenDialer();
    } else {
      setActiveNavTab(tab);
      if (tab !== 'contacts') {
        Alert.alert('AAWAZ Navigation', `${tab.toUpperCase()} module loaded.`);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoTitle}>AAWAZ</Text>
          <View style={styles.headerSubBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.headerSubText}>VERIFIED CHANNEL</Text>
          </View>
        </View>

        {/* Safe Zone Badge Pill */}
        <View style={styles.safeZoneBadge}>
          <SafeZoneShieldIcon size={14} color={Theme.colors.verifiedGreen} />
          <Text style={styles.safeZoneText}>SAFE ZONE</Text>
        </View>
      </View>

      {/* Category Tabs (Official vs Personal) */}
      <CategoryTabs
        activeTab={activeCategory}
        officialCount={MOCK_OFFICIAL_CONTACTS.length}
        personalCount={MOCK_PERSONAL_CONTACTS.length}
        onSelectTab={setActiveCategory}
      />

      {/* Search Input Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onPressFilter={() => Alert.alert('AAWAZ Filter', 'Filter by verification status / organization.')}
      />

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item: Contact) => item.id}
        renderItem={({ item }: { item: Contact }) => (
          <ContactCard
            contact={item}
            onPressCall={handleCallContact}
            onPressCard={(contact: Contact) => {
              if (onSelectContact) {
                onSelectContact(contact);
              } else {
                handleCallContact(contact);
              }
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No verified contacts found</Text>
          </View>
        }
      />

      {/* Bottom Navigation Bar with Floating Dialer FAB */}
      <BottomNavBar
        activeTab={activeNavTab}
        onSelectTab={handleSelectNavTab}
        onPressDialer={onOpenDialer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: Theme.colors.textPrimary,
  },
  headerSubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.verifiedGreen,
  },
  headerSubText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Theme.colors.verifiedGreen,
  },
  safeZoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.verifiedGreenGlow,
    borderWidth: 1,
    borderColor: Theme.colors.verifiedGreenBorder,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
  },
  safeZoneText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Theme.colors.verifiedGreen,
  },
  listContent: {
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xxl,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.textMuted,
  },
});
