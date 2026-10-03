require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

// ------------------------------------------------------------
// In-memory stand-in for the Supabase admin client.
// Supports the update().eq().neq().select() chain that
// closeOpenOffers uses, so no real database is touched.
// ------------------------------------------------------------

function createFakeDatabase(tables) {
  function from(table) {
    const filters = [];
    let changes = null;
    let error = null;

    const builder = {
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

      select() {
        return builder;
      },

      then(resolve, reject) {
        try {
          if (!tables[table]) {
            error = { message: `unknown table ${table}` };
            return Promise.resolve({ data: null, error }).then(resolve, reject);
          }

          const matched = tables[table].filter(
            row => filters.every(filter => filter(row))
          );

          matched.forEach(row => Object.assign(row, changes));

          return Promise.resolve({
            data: matched.map(row => ({ ...row })),
            error: null
          }).then(resolve, reject);
        } catch (thrown) {
          return Promise.reject(thrown).then(resolve, reject);
        }
      }
    };

    return builder;
  }

  return { from };
}

const tables = {
  blood_request_responses: [
    { id: 'r1', request_id: 'req-1', donor_id: 'donor-a', status: 'pending' },
    { id: 'r2', request_id: 'req-1', donor_id: 'donor-b', status: 'accepted' },
    { id: 'r3', request_id: 'req-1', donor_id: 'donor-c', status: 'pending' },
    { id: 'r4', request_id: 'req-2', donor_id: 'donor-a', status: 'pending' }
  ],

  blood_request_invitations: [
    { id: 'i1', request_id: 'req-1', donor_id: 'donor-d', status: 'pending' },
    { id: 'i2', request_id: 'req-1', donor_id: 'donor-e', status: 'declined' },
    { id: 'i3', request_id: 'req-2', donor_id: 'donor-d', status: 'pending' }
  ],

  blood_request_trips: [
    { id: 't1', request_id: 'req-1', status: 'active', latitude: 14.6, longitude: 121 },
    { id: 't2', request_id: 'req-2', status: 'active', latitude: 14.5, longitude: 121 }
  ]
};

// Swap in the fake client before the service loads it.
const supabasePath = require.resolve('../src/config/supabase');

require.cache[supabasePath] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: {
    supabaseAdmin: createFakeDatabase(tables),
    supabaseAnon: {}
  }
};

const {
  closeOpenOffers
} = require('../src/services/requestClosingService');

const byId = (table, id) => tables[table].find(row => row.id === id);

test('closing a request closes only its own open offers, invitations and trips', async () => {
  const closed = await closeOpenOffers('req-1');

  // Donors whose offer or invitation was closed (to notify them).
  assert.deepEqual(closed.pendingDonorIds.sort(), ['donor-a', 'donor-c']);
  assert.deepEqual(closed.invitedDonorIds, ['donor-d']);

  // Pending offers rejected; the accepted one is kept.
  assert.equal(byId('blood_request_responses', 'r1').status, 'rejected');
  assert.equal(byId('blood_request_responses', 'r3').status, 'rejected');
  assert.equal(byId('blood_request_responses', 'r2').status, 'accepted');

  // Pending invitations cancelled; answered ones are kept.
  assert.equal(byId('blood_request_invitations', 'i1').status, 'cancelled');
  assert.ok(byId('blood_request_invitations', 'i1').responded_at);
  assert.equal(byId('blood_request_invitations', 'i2').status, 'declined');

  // Live trip ended and its location cleared.
  const trip = byId('blood_request_trips', 't1');
  assert.equal(trip.status, 'ended');
  assert.equal(trip.latitude, null);
  assert.equal(trip.longitude, null);

  // Another request is untouched.
  assert.equal(byId('blood_request_responses', 'r4').status, 'pending');
  assert.equal(byId('blood_request_invitations', 'i3').status, 'pending');
  assert.equal(byId('blood_request_trips', 't2').status, 'active');
});

test('closing an already closed request changes nothing', async () => {
  const closed = await closeOpenOffers('req-1');

  assert.deepEqual(closed, { pendingDonorIds: [], invitedDonorIds: [] });
});

test('a database error never throws', async () => {
  const saved = tables.blood_request_invitations;
  delete tables.blood_request_invitations;

  const originalError = console.error;
  console.error = () => {};

  try {
    const closed = await closeOpenOffers('req-2');

    // Offers still close; the failed step is reported as empty.
    assert.deepEqual(closed.pendingDonorIds, ['donor-a']);
    assert.deepEqual(closed.invitedDonorIds, []);
  } finally {
    console.error = originalError;
    tables.blood_request_invitations = saved;
  }
});
