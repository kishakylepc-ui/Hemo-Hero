const {
  reverseGeocode
} = require(
  '../services/geocodeService'
);

// ============================================================
// GET /api/geocode/reverse?latitude=..&longitude=..
//
// Barangay, city and province for a GPS point, used to fill in
// the address on Complete Profile. The point isn't logged.
// ============================================================

async function getAddressFromLocation(
  req,
  res
) {
  const latitude =
    Number(
      req.query.latitude
    );

  const longitude =
    Number(
      req.query.longitude
    );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return res
      .status(400)
      .json({
        error:
          'A valid latitude and longitude are required.'
      });
  }

  try {
    const address =
      await reverseGeocode(
        latitude,
        longitude
      );

    if (!address) {
      return res
        .status(404)
        .json({
          error:
            'No address was found for this location.'
        });
    }

    return res
      .status(200)
      .json({
        address,

        attribution:
          'Address data © OpenStreetMap contributors'
      });
  } catch (error) {
    console.error(
      'REVERSE GEOCODE ERROR:',
      error.message ||
        error
    );

    return res
      .status(502)
      .json({
        error:
          'The address lookup is unavailable right now. Please type your address.'
      });
  }
}

module.exports = {
  getAddressFromLocation
};
