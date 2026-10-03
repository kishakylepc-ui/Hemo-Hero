require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  distanceMeters,
  distanceToRouteMeters,
  readRoute,
  estimateRoute,
  formatEta
} = require('../src/services/tripService');

const { isExpoPushToken } = require('../src/services/pushService');

test('distance between two Manila points is about 4.2 km', () => {
  const meters = distanceMeters(
    { latitude: 14.5995, longitude: 120.9842 },
    { latitude: 14.6091, longitude: 121.0223 }
  );

  assert.ok(meters > 4100 && meters < 4350, `got ${meters}`);
});

test('distance to the route line: on the line vs off it', () => {
  const route = [
    [14.6, 120.98],
    [14.6, 121.0]
  ];

  assert.ok(distanceToRouteMeters({ latitude: 14.6, longitude: 120.99 }, route) < 1);

  const off = distanceToRouteMeters({ latitude: 14.601, longitude: 120.99 }, route);
  assert.ok(off > 100 && off < 120, `got ${off}`);

  // No route line: never counts as off route.
  assert.equal(distanceToRouteMeters({ latitude: 14.6, longitude: 120.99 }, null), 0);
});

test('stored routes: old point arrays and { points, steps } both read', () => {
  const points = [[1, 2], [3, 4]];

  assert.deepEqual(readRoute(points), { points, steps: [] });
  assert.deepEqual(readRoute({ points, steps: [{ type: 'arrive' }] }).steps, [{ type: 'arrive' }]);
  assert.deepEqual(readRoute(null), { points: null, steps: [] });
});

test('estimated route is longer than a straight line and has an ETA', () => {
  const from = { latitude: 14.5995, longitude: 120.9842 };
  const to = { latitude: 14.6091, longitude: 121.0223 };
  const estimate = estimateRoute(from, to);

  assert.ok(estimate.distance_m > distanceMeters(from, to));
  assert.ok(estimate.eta_seconds > 0);
  assert.equal(estimate.geometry, null);
});

test('ETA text', () => {
  assert.equal(formatEta(20), 'less than a minute');
  assert.equal(formatEta(6 * 60), '6 min');
  assert.equal(formatEta(65 * 60), '1 hr 5 min');
  assert.equal(formatEta(120 * 60), '2 hr');
});

test('only Expo push tokens are accepted', () => {
  assert.equal(isExpoPushToken('ExponentPushToken[abc123]'), true);
  assert.equal(isExpoPushToken('ExpoPushToken[abc123]'), true);
  assert.equal(isExpoPushToken('hello'), false);
  assert.equal(isExpoPushToken(''), false);
  assert.equal(isExpoPushToken(null), false);
});
