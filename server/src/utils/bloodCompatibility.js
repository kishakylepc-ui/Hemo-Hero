// ============================================================
// BLOOD TYPE COMPATIBILITY
//
// Red blood cell compatibility only.
//
// Important:
// - recipientBloodType = blood type needed by the request
// - donorBloodType = verified blood type of the donor
//
// This is used for Hemo-Hero donor matching only.
// Final transfusion compatibility must still be confirmed
// by qualified medical personnel and blood-bank testing.
// ============================================================

const VALID_BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

// ============================================================
// COMPATIBLE DONORS FOR A RECIPIENT
//
// Key:
// recipient / requested blood type
//
// Value:
// donor blood types that may provide red blood cells
// ============================================================

const COMPATIBLE_DONOR_TYPES = {
  'O-': [
    'O-',
  ],

  'O+': [
    'O-',
    'O+',
  ],

  'A-': [
    'O-',
    'A-',
  ],

  'A+': [
    'O-',
    'O+',
    'A-',
    'A+',
  ],

  'B-': [
    'O-',
    'B-',
  ],

  'B+': [
    'O-',
    'O+',
    'B-',
    'B+',
  ],

  'AB-': [
    'O-',
    'A-',
    'B-',
    'AB-',
  ],

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

// ============================================================
// NORMALIZE BLOOD TYPE
// ============================================================

function normalizeBloodType(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .toUpperCase();

  if (
    !VALID_BLOOD_TYPES.includes(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

// ============================================================
// GET COMPATIBLE DONOR TYPES
//
// Example:
// recipient A+
// -> O-, O+, A-, A+
// ============================================================

function getCompatibleDonorTypes(
  recipientBloodType
) {
  const recipient =
    normalizeBloodType(
      recipientBloodType
    );

  if (!recipient) {
    return [];
  }

  return [
    ...(
      COMPATIBLE_DONOR_TYPES[
        recipient
      ] || []
    ),
  ];
}

// ============================================================
// CHECK DONOR -> RECIPIENT COMPATIBILITY
//
// Example:
//
// Request/recipient: A+
// Donor: O+
// -> true
//
// Request/recipient: O+
// Donor: A+
// -> false
// ============================================================

function areRedBloodCellsCompatible(
  recipientBloodType,
  donorBloodType
) {
  const recipient =
    normalizeBloodType(
      recipientBloodType
    );

  const donor =
    normalizeBloodType(
      donorBloodType
    );

  if (
    !recipient ||
    !donor
  ) {
    return false;
  }

  const compatibleDonors =
    getCompatibleDonorTypes(
      recipient
    );

  return compatibleDonors.includes(
    donor
  );
}

// ============================================================
// GET REQUEST TYPES A DONOR CAN HELP
//
// This is the REVERSE direction.
//
// Example:
// O- donor
// -> can potentially donate red cells to every blood type
//
// AB+ donor
// -> can potentially donate red cells only to AB+
// ============================================================

function getCompatibleRecipientTypesForDonor(
  donorBloodType
) {
  const donor =
    normalizeBloodType(
      donorBloodType
    );

  if (!donor) {
    return [];
  }

  return VALID_BLOOD_TYPES.filter(
    recipient =>
      areRedBloodCellsCompatible(
        recipient,
        donor
      )
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  VALID_BLOOD_TYPES,

  COMPATIBLE_DONOR_TYPES,

  normalizeBloodType,

  getCompatibleDonorTypes,

  getCompatibleRecipientTypesForDonor,

  areRedBloodCellsCompatible,
};