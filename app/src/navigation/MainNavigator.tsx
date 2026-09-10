import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { ContactListScreen } from '../screens/ContactListScreen';
import { DialerScreen } from '../screens/DialerScreen';
import { ContactDetailScreen } from '../screens/ContactDetailScreen';
import { PermissionPrimerScreen } from '../screens/PermissionPrimerScreen';
import { PostCallReportScreen } from '../screens/PostCallReportScreen';
import { IncomingCallScreen } from '../screens/IncomingCallScreen';
import { ActiveCallScreen } from '../screens/ActiveCallScreen';
import { Contact, MOCK_OFFICIAL_CONTACTS } from '../mock/contactsData';
import { Theme } from '../theme';

export type ScreenName = 'contacts' | 'dialer' | 'contactDetail' | 'primer' | 'report' | 'incomingCall' | 'activeCall';

export const MainNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('contacts');
  const [selectedContact, setSelectedContact] = useState<Contact>(MOCK_OFFICIAL_CONTACTS[3]);

  const handleSelectContact = (contact: Contact): void => {
    setSelectedContact(contact);
    setCurrentScreen('contactDetail');
  };

  const handleInitiateCall = (phoneNumber: string, _isVerified: boolean): void => {
    const matched = MOCK_OFFICIAL_CONTACTS.find((c) => c.phoneNumber === phoneNumber);
    if (matched) {
      setSelectedContact(matched);
    }
    setCurrentScreen('activeCall');
  };

  return (
    <View style={styles.container}>
      {/* Demo Floating Bar to switch screens for testing */}
      {currentScreen !== 'primer' ? (
        <View style={styles.topDemoBar}>
          <Pressable
            style={[styles.demoPill, currentScreen === 'activeCall' && styles.demoPillActive]}
            onPress={() => setCurrentScreen(currentScreen === 'activeCall' ? 'contacts' : 'activeCall')}
          >
            <Text style={styles.demoPillText}>
              {currentScreen === 'activeCall' ? '← Back' : '🤙 Active Call'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.demoPill, currentScreen === 'incomingCall' && styles.demoPillActive]}
            onPress={() => setCurrentScreen(currentScreen === 'incomingCall' ? 'contacts' : 'incomingCall')}
          >
            <Text style={styles.demoPillText}>
              {currentScreen === 'incomingCall' ? '← Back' : '📞 Incoming'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.demoPill, currentScreen === 'report' && styles.demoPillActive]}
            onPress={() => setCurrentScreen(currentScreen === 'report' ? 'contacts' : 'report')}
          >
            <Text style={styles.demoPillText}>
              {currentScreen === 'report' ? '← Back' : '📄 Forensic'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {currentScreen === 'primer' ? (
        <PermissionPrimerScreen
          onCompletePrimer={() => setCurrentScreen('contacts')}
        />
      ) : currentScreen === 'activeCall' ? (
        <ActiveCallScreen
          contact={selectedContact}
          onEndCall={() => setCurrentScreen('report')}
          onOpenReportDetails={() => setCurrentScreen('report')}
          onMinimizeCall={() => setCurrentScreen('contacts')}
        />
      ) : currentScreen === 'incomingCall' ? (
        <IncomingCallScreen
          contact={selectedContact}
          onAcceptCall={() => setCurrentScreen('activeCall')}
          onDeclineCall={() => setCurrentScreen('contacts')}
        />
      ) : currentScreen === 'report' ? (
        <PostCallReportScreen
          onBackToHome={() => setCurrentScreen('contacts')}
        />
      ) : currentScreen === 'contacts' ? (
        <ContactListScreen
          onOpenDialer={() => setCurrentScreen('dialer')}
          onSelectContact={handleSelectContact}
          onInitiateCall={(phone: string, isVerified: boolean) => {
            handleInitiateCall(phone, isVerified);
          }}
        />
      ) : currentScreen === 'contactDetail' && selectedContact ? (
        <ContactDetailScreen
          contact={selectedContact}
          onBackPress={() => setCurrentScreen('contacts')}
          onInitiateCall={handleInitiateCall}
          onOpenReport={() => setCurrentScreen('report')}
        />
      ) : (
        <DialerScreen
          onBackPress={() => setCurrentScreen('contacts')}
          onInitiateCall={handleInitiateCall}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.bgDark,
  },
  topDemoBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  demoPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surfaceDark,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
  },
  demoPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  demoPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
  },
});
