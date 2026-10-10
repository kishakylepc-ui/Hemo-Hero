require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

// ------------------------------------------------------------
// In-memory stand-in for the Supabase admin client.
// Supports the select / update chains (eq, neq, in,
// maybeSingle) the release service and closeOpenOffers use,
// so no real database is touched.
// ------------------------------------------------------------

function createFakeDatabase(tables) {
  function from(table) {
    const filters = [];
    let changes = null;
    let single = false;

    const builder = {
      select() {
        return builder;
      },

      update(fields) {
        changes = fields;
        return builder;
      },

      eq(column, value) {
        filters.push(row => row[column] === value);
        return builder;
      },

      neq(column, value) {
        filters.push(row => row[column] !== value);
        return builder;
      },

      in(column, values) {
        filters.push(row => values.includes(row[column]));
        return builder;
      },

      maybeSingle() {
        single = true;
        return builder;
      },

      then(resolve, reject) {
        if (!tables[table]) {
          return Promise.resolve({
            data: null,
            error: { message: `unknown table ${table}` }
          }).then(resolve, reject);
        }

        const matched = tables[table].filter(
          row => filters.every(filter => filter(row))
        );

        if (changes) {
          matched.forEach(row => Object.assign(row, changes));
        }

        const rows = matched.map(row => ({ ...row }));

        return Promise.resolve({
          data: single ? rows[0] || null : rows,
          error: null
        }).then(resolve, reject);
      }
    };

    return builder;
  }

  return { from };
}

const USER = 'user-x';

const tables = {
  users: [
    { id: USER, first_name: 'Juan' }
  ],

  blood_requests: [
    // Other people's requests the user offered on.
    { id: 'req-a', requester_id: 'req-owner-a', blood_type: 'O+', facility_name: 'City Hospital', status: 'active' },
    { id: 'req-b', requester_id: 'req-owner-b', blood_type: 'A+', facility_name: 'Red Cross', status: 'active' },
    { id: 'req-c', requester_id: 'req-owner-c', blood_type: 'B+', facility_name: 'General', status: 'active' },
    { id: 'req-d', requester_id: 'req-owner-d', blood_type: 'O-', facility_name: 'Clinic', status: 'fulfilled' },
    { id: 'req-e', requester_id: 'req-owner-e', blood_type: 'AB+', facility_name: 'Medical Center', status: 'active' },

    // The user's own requests.
    { id: 'own-1', requester_id: USER, blood_type: 'O+', facility_name: 'City Hospital', status: 'active' },
    { id: 'own-2', requester_id: USER, blood_type: 'A-', facility_name: 'Red Cross', status: 'active' },
    { id: 'own-3', requester_id: USER, blood_type: 'B-', facility_name: 'General', status: 'expired' }
  ],

  blood_request_responses: [
    // Accepted, nothing donated yet: released.
    { id: 'r-a', request_id: 'req-a', donor_id: USER, status: 'accepted' },
    // Accepted and already donated: kept.
    { id: 'r-b', request_id: 'req-b', donor_id: USER, status: 'accepted' },
    // Pending: released.
    { id: 'r-c', request_id: 'req-c', donor_id: USER, status: 'pending' },
    // On a closed request: kept.
    { id: 'r-d', request_id: 'req-d', donor_id: USER, status: 'accepted' },

    // Donors on the user's own requests.
    { id: 'own-1-accepted', request_id: 'own-1', donor_id: 'donor-1', status: 'accepted' },
    { id: 'own-1-pending', request_id: 'own-1', donor_id: 'donor-2', status: 'pending' },
    { id: 'own-2-accepted', request_id: 'own-2', donor_id: 'donor-4', status: 'accepted' }
  ],

  blood_request_invitations: [
    { id: 'i-e', request_id: 'req-e', requester_id: 'req-owner-e', donor_id: USER, status: 'pending' },
    { id: 'i-old', request_id: 'req-e', requester_id: 'req-owner-e', donor_id: USER, status: 'declined' },
    { id: 'own-1-invite', request_id: 'own-1', requester_id: USER, donor_id: 'donor-3', status: 'pending' }
  ],

  blood_donations: [
    { id: 'd-b', request_id: 'req-b', response_id: 'r-b', status: 'completed' },
    { id: 'd-own-2', request_id: 'own-2', response_id: 'own-2-accepted', status: 'completed' },
    { id: 'd-rejected', request_id: 'own-1', response_id: 'own-1-accepted', status: 'rejected' }
  ],

  blood_request_trips: [
    { id: 't-a', request_id: 'req-a', response_id: 'r-a', status: 'active', latitude: 14.6, longitude: 121 },
    { id: 't-b', request_id: 'req-b', response_id: 'r-b', status: 'active', latitude: 14.5, longitude: 121 }
  ]
};

// Swap in the fake client and capture notifications before the
// service loads them.
const sent = [];

function stub(modulePath, exports) {
  const resolved = require.resolve(modulePath);

  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports
  };
}

stub('../src/config/supabase', {
  supabaseAdmin: createFakeDatabase(tables),
  supabaseAnon: {}
});

stub('../src/services/notificationService', {
  createNotification: async row => {
    sent.push(row);
    return row;
  },

  createNotifications: async rows => {
    sent.push(...rows);
    return rows;
  },

  notifyAdmins: async () => []
});

const {
  releaseDeactivatedAccount,
  describeRelease
} = require('../src/services/accountReleaseService');

const byId = (table, id) => tables[table].find(row => row.id === id);
const sentTo = userId => sent.filter(row => row.userId === userId);

test('a deactivated account stops holding up other people', async () => {
  const result = await releaseDeactivatedAccount(USER);

  assert.deepEqual(result, {
    releasedOffers: 2,
    cancelledInvitations: 1,
    closedRequests: 2
  });

  // As a donor: open offers on active requests released.
  assert.equal(byId('blood_request_responses', 'r-a').status, 'withdrawn');
  assert.equal(byId('blood_request_responses', 'r-c').status, 'withdrawn');

  // Already donated, or on a closed request: left alone.
  assert.equal(byId('blood_request_responses', 'r-b').status, 'accepted');
  assert.equal(byId('blood_request_responses', 'r-d').status, 'accepted');

  // The released donor's trip ended; the donated one's didn't.
  assert.equal(byId('blood_request_trips', 't-a').status, 'ended');
  assert.equal(byId('blood_request_trips', 't-b').status, 'active');

  // Pending invitation cancelled; answered one kept.
  assert.equal(byId('blood_request_invitations', 'i-e').status, 'cancelled');
  assert.equal(byId('blood_request_invitations', 'i-old').status, 'declined');

  // As a requester: no donation -> cancelled, donation -> fulfilled.
  assert.equal(byId('blood_requests', 'own-1').status, 'cancelled');
  assert.ok(byId('blood_requests', 'own-1').cancelled_at);
  assert.equal(byId('blood_requests', 'own-2').status, 'fulfilled');
  assert.ok(byId('blood_requests', 'own-2').fulfilled_at);
  assert.equal(byId('blood_requests', 'own-3').status, 'expired');

  // Their own request's open offers and invitations closed.
  assert.equal(byId('blood_request_responses', 'own-1-pending').status, 'rejected');
  assert.equal(byId('blood_request_invitations', 'own-1-invite').status, 'cancelled');
});

test('everyone who was waiting is told', () => {
  // Requester whose accepted donor was released.
  const [ownerA] = sentTo('req-owner-a');
  assert.equal(ownerA.type, 'donor_response_withdrawn');
  assert.equal(ownerA.title, 'Donor No Longer Available');
  assert.match(ownerA.message, /^Juan can no longer donate/);
  assert.equal(ownerA.data.request_id, 'req-a');

  // Requester whose pending offer was released.
  assert.equal(sentTo('req-owner-c')[0].title, 'Donor Response Withdrawn');

  // Requester whose invitation was cancelled.
  assert.equal(sentTo('req-owner-e')[0].data.kind, 'donor_invitation_declined');

  // Donors on the user's own requests.
  for (const donorId of ['donor-1', 'donor-2', 'donor-3']) {
    assert.equal(sentTo(donorId)[0].type, 'blood_request_cancelled');
  }

  assert.equal(sentTo('donor-4')[0].type, 'blood_request_fulfilled');

  // Nobody about the untouched offers, and never the user.
  assert.equal(sentTo('req-owner-b').length, 0);
  assert.equal(sentTo('req-owner-d').length, 0);
  assert.equal(sentTo(USER).length, 0);
});

test('running it again changes nothing', async () => {
  const before = sent.length;

  const result = await releaseDeactivatedAccount(USER);

  assert.deepEqual(result, {
    releasedOffers: 0,
    cancelledInvitations: 0,
    closedRequests: 0
  });

  assert.equal(sent.length, before);
});

test('the admin summary reads naturally', () => {
  assert.equal(
    describeRelease({ releasedOffers: 2, cancelledInvitations: 1, closedRequests: 2 }),
    '2 offers released, 1 invitation cancelled and 2 requests closed.'
  );

  assert.equal(
    describeRelease({ releasedOffers: 1, cancelledInvitations: 0, closedRequests: 0 }),
    '1 offer released.'
  );

  assert.equal(
    describeRelease({ releasedOffers: 0, cancelledInvitations: 0, closedRequests: 0 }),
    ''
  );
});
