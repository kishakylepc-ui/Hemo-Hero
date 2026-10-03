require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  toAddress
} = require('../src/services/geocodeService');

// Shapes below are real Nominatim GeocodeJSON answers for public
// landmarks (city halls and capitols).

test('province city: barangay from the nearest area, province from level 4', () => {
  assert.deepEqual(
    toAddress({
      admin: { level8: 'Ormoc City Proper', level6: 'Ormoc', level4: 'Leyte', level3: 'Eastern Visayas' },
      city: 'Ormoc',
      district: 'MacArthur',
      state: 'Leyte'
    }),
    { barangay: 'MacArthur', city: 'Ormoc', province: 'Leyte', barangay_exact: false }
  );
});

test('a mapped barangay boundary is exact; a city outside any province gets its province', () => {
  assert.deepEqual(
    toAddress({
      admin: { level10: 'Barangay 15', level6: 'Tacloban', level3: 'Eastern Visayas' },
      city: 'Tacloban',
      district: 'Downtown',
      locality: 'Barangay 15',
      state: 'Eastern Visayas'
    }),
    { barangay: 'Barangay 15', city: 'Tacloban', province: 'Leyte', barangay_exact: true }
  );
});

test('Metro Manila: numbered barangay and Metro Manila as province', () => {
  assert.deepEqual(
    toAddress({
      admin: { level8: 'Ermita', level7: 'Fifth District', level6: 'Manila', level5: 'Capital District', level3: 'Metro Manila' },
      city: 'Manila',
      district: 'Ermita',
      locality: '659'
    }),
    { barangay: 'Barangay 659', city: 'Manila', province: 'Metro Manila', barangay_exact: false }
  );
});

test('"Cebu City" maps to Cebu province', () => {
  assert.equal(
    toAddress({ admin: { level6: 'Cebu City', level3: 'Central Visayas' }, district: 'Camputhaw' }).province,
    'Cebu'
  );
});

test('unknown places leave the province empty to type in', () => {
  assert.deepEqual(
    toAddress({ admin: { level6: 'Somewhere' }, street: 'Main Street' }),
    { barangay: 'Main Street', city: 'Somewhere', province: '', barangay_exact: false }
  );

  assert.deepEqual(
    toAddress(null),
    { barangay: '', city: '', province: '', barangay_exact: false }
  );
});
