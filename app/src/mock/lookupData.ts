/**
 * Mock data layer for AAWAZ Acoustic Lookup Engine
 * // TODO(UI): expects dynamic acoustic lookup payload & state stream from Track 1 (ML) / Track 3 (Backend)
 */

export interface AcousticLookupResult {
  phoneNumber: string;
  isVerified: boolean;
  entityName: string;
  channelId?: string;
  securityMessage: string;
  voiceprintEnclaveActive: boolean;
}

export const MOCK_LOOKUP_DATABASE: Record<string, Omit<AcousticLookupResult, 'phoneNumber'>> = {
  '18002026161': {
    isVerified: true,
    entityName: 'HDFC Bank Priority Support',
    channelId: 'HDFC-8822',
    securityMessage: 'Verified Channel available for this number.',
    voiceprintEnclaveActive: true,
  },
  '1800112211': {
    isVerified: true,
    entityName: 'State Bank of India Corporate Desk',
    channelId: 'SBI-9910',
    securityMessage: 'Verified Channel available for this number.',
    voiceprintEnclaveActive: true,
  },
  '9876543210': {
    isVerified: true,
    entityName: 'AAWAZ Security Operations',
    channelId: 'AAWZ-0001',
    securityMessage: 'Verified Channel available for this number.',
    voiceprintEnclaveActive: true,
  },
};

/**
 * Normalizes input digits to clean raw numeric string
 */
export const cleanPhoneNumber = (raw: string): string => {
  return raw.replace(/[^0-9]/g, '');
};

/**
 * Simulates acoustic engine lookup response for a given raw or formatted number
 */
export const mockAcousticLookup = (rawNumber: string): AcousticLookupResult => {
  const digits = cleanPhoneNumber(rawNumber);

  if (MOCK_LOOKUP_DATABASE[digits]) {
    return {
      phoneNumber: rawNumber,
      ...MOCK_LOOKUP_DATABASE[digits],
    };
  }

  // Fallback for unverified / unknown entities
  return {
    phoneNumber: rawNumber,
    isVerified: false,
    entityName: digits.length > 0 ? 'Unknown Individual Caller' : 'Enter a number',
    securityMessage: "This number isn't on AAWAZ yet.",
    voiceprintEnclaveActive: false,
  };
};
