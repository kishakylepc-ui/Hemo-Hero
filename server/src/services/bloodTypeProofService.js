const crypto =
  require('crypto');

const path =
  require('path');

const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

// ============================================================
// BLOOD TYPE PROOF
//
// A photo that shows the user's blood type: a blood donor card,
// a blood typing result or a lab result. It's needed to put a
// blood type on the profile and to apply as a donor. Admins see
// it when they review donor applications.
//
// Stored in the private donor-verification bucket (with the
// government IDs) at blood-type-proofs/<userId>/<time>-<id>.<ext>.
// Only the newest file is kept.
// ============================================================

const PROOF_BUCKET =
  'donor-verification';

const PROOF_ROOT =
  'blood-type-proofs';

// Admin links expire after 5 minutes, like government IDs.
const SIGNED_URL_EXPIRES_IN =
  5 * 60;

function getFolder(
  userId
) {
  return `${PROOF_ROOT}/${userId}`;
}

function getExtension(
  file
) {
  const original =
    path
      .extname(
        file.originalname ||
        ''
      )
      .toLowerCase();

  if (
    [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp'
    ].includes(
      original
    )
  ) {
    return original;
  }

  switch (
    file.mimetype
  ) {
    case 'image/png':
      return '.png';

    case 'image/webp':
      return '.webp';

    default:
      return '.jpg';
  }
}

// The user's proof files, newest first (names start with the
// upload time).
async function listProofFiles(
  userId
) {
  const {
    data,
    error
  } =
    await supabaseAdmin
      .storage
      .from(
        PROOF_BUCKET
      )
      .list(
        getFolder(
          userId
        ),
        {
          limit: 100
        }
      );

  if (error) {
    throw error;
  }

  return (data || [])
    .filter(
      file =>
        file.name &&
        !file.name.startsWith('.')
    )
    .sort(
      (a, b) =>
        b.name.localeCompare(
          a.name
        )
    );
}

// Newest proof as { path, uploaded_at }, or null. Never throws.
async function getBloodTypeProof(
  userId
) {
  try {
    const [
      file
    ] =
      await listProofFiles(
        userId
      );

    if (!file) {
      return null;
    }

    return {
      path:
        `${getFolder(userId)}/${file.name}`,

      uploaded_at:
        file.created_at ||
        file.updated_at ||
        null
    };
  } catch (error) {
    console.error(
      'GET BLOOD TYPE PROOF ERROR:',
      error
    );

    return null;
  }
}

// Removes the user's proofs, except keepPath. Never throws.
async function removeBloodTypeProofs(
  userId,
  keepPath = null
) {
  try {
    const paths =
      (
        await listProofFiles(
          userId
        )
      )
        .map(
          file =>
            `${getFolder(userId)}/${file.name}`
        )
        .filter(
          filePath =>
            filePath !== keepPath
        );

    if (!paths.length) {
      return;
    }

    const {
      error
    } =
      await supabaseAdmin
        .storage
        .from(
          PROOF_BUCKET
        )
        .remove(
          paths
        );

    if (error) {
      console.error(
        'REMOVE BLOOD TYPE PROOFS ERROR:',
        error
      );
    }
  } catch (error) {
    console.error(
      'REMOVE BLOOD TYPE PROOFS ERROR:',
      error
    );
  }
}

// Saves a new proof (multer file) and removes the older ones.
// Throws when the upload fails.
async function saveBloodTypeProof(
  userId,
  file
) {
  const name =
    `${Date.now()}-${crypto
      .randomBytes(8)
      .toString('hex')}${getExtension(
      file
    )}`;

  const storagePath =
    `${getFolder(userId)}/${name}`;

  const {
    error
  } =
    await supabaseAdmin
      .storage
      .from(
        PROOF_BUCKET
      )
      .upload(
        storagePath,
        file.buffer,
        {
          contentType:
            file.mimetype,

          upsert:
            false
        }
      );

  if (error) {
    throw error;
  }

  await removeBloodTypeProofs(
    userId,
    storagePath
  );

  return {
    path:
      storagePath,

    uploaded_at:
      new Date()
        .toISOString()
  };
}

// For admins: a short-lived link to the newest proof.
async function getBloodTypeProofLink(
  userId
) {
  const missing = {
    available:
      false,

    url:
      null,

    uploaded_at:
      null,

    expires_in_seconds:
      SIGNED_URL_EXPIRES_IN
  };

  const proof =
    await getBloodTypeProof(
      userId
    );

  if (!proof) {
    return missing;
  }

  const {
    data,
    error
  } =
    await supabaseAdmin
      .storage
      .from(
        PROOF_BUCKET
      )
      .createSignedUrl(
        proof.path,
        SIGNED_URL_EXPIRES_IN
      );

  if (error) {
    console.error(
      'BLOOD TYPE PROOF SIGNED URL ERROR:',
      error
    );

    return missing;
  }

  return {
    available:
      true,

    url:
      data?.signedUrl ||
      null,

    uploaded_at:
      proof.uploaded_at,

    expires_in_seconds:
      SIGNED_URL_EXPIRES_IN
  };
}

module.exports = {
  getBloodTypeProof,
  saveBloodTypeProof,
  removeBloodTypeProofs,
  getBloodTypeProofLink
};
