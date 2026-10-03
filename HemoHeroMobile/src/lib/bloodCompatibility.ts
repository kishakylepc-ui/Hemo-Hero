// ============================================================
// BLOOD TYPE COMPATIBILITY (mobile)
//
// Mirrors server/src/utils/bloodCompatibility.js so the app
// shows the same red-blood-cell matching the server uses for
// donor matching.
//
// Guidance only - final transfusion compatibility is always
// confirmed by blood-bank testing.
// ============================================================

export const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export type BloodType =
  (typeof BLOOD_TYPES)[number];

// Recipient type -> donor types that may give red cells.
const COMPATIBLE_DONOR_TYPES: Record<
  BloodType,
  BloodType[]
> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': [
    'O-',
    'O+',
    'A-',
    'A+',
    'B-',
    'B+',
    'AB-',
    'AB+',
  ],
};

export function isBloodType(
  value: unknown
): value is BloodType {
  return BLOOD_TYPES.includes(
    String(value || '')
      .trim()
      .toUpperCase() as BloodType
  );
}

// Donor types that can give red cells to this recipient.
export function getCompatibleDonorTypes(
  recipient: BloodType
): BloodType[] {
  return [
    ...COMPATIBLE_DONOR_TYPES[recipient],
  ];
}

// Recipient types this donor can give red cells to.
export function getCompatibleRecipientTypes(
  donor: BloodType
): BloodType[] {
  return BLOOD_TYPES.filter(recipient =>
    COMPATIBLE_DONOR_TYPES[recipient].includes(
      donor
    )
  );
}
