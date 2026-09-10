/**
 * Mock dataset for AAWAZ Call History & Enclave Acoustic Session Log
 * // TODO(UI): expects acoustic log history & session metadata from Track 1 (ML) / Track 3 (Backend)
 */

export interface CallSession {
  id: string;
  contactId: string;
  type: 'incoming' | 'outgoing';
  intercepted?: boolean;
  status: 'risk' | 'safe';
  riskScore: number; // 0 - 100
  timestamp: string;
  duration: string;
}

export const MOCK_CALL_SESSIONS: CallSession[] = [
  {
    id: 'sess-1',
    contactId: 'off-4', // HDFC Priority Support
    type: 'incoming',
    intercepted: true,
    status: 'risk',
    riskScore: 88,
    timestamp: 'Today, 09:40',
    duration: '05m 14s',
  },
  {
    id: 'sess-2',
    contactId: 'off-4',
    type: 'outgoing',
    intercepted: false,
    status: 'safe',
    riskScore: 12,
    timestamp: 'Yesterday, 16:15',
    duration: '02m 45s',
  },
  {
    id: 'sess-3',
    contactId: 'off-4',
    type: 'incoming',
    intercepted: false,
    status: 'safe',
    riskScore: 8,
    timestamp: '12 Oct, 11:20',
    duration: '08m 10s',
  },
];

/**
 * Retrieves call sessions for a given contact ID
 */
export const getCallSessionsForContact = (contactId: string): CallSession[] => {
  const filtered = MOCK_CALL_SESSIONS.filter((s) => s.contactId === contactId);
  return filtered.length > 0 ? filtered : MOCK_CALL_SESSIONS;
};
