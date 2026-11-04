// ============================================================
// LAST-RESORT ERROR HANDLER
//
// Controllers answer their own errors. This catches what never
// reached one, like a request with broken JSON. Without it,
// Express replies with an HTML page showing the stack trace and
// the server's file paths.
// ============================================================

function errorHandler(
  error,
  req,
  res,
  next
) {
  if (
    res.headersSent
  ) {
    return next(
      error
    );
  }

  const status =
    Number(
      error?.status ||
        error?.statusCode
    );

  // The request itself was bad. This isn't logged: the error
  // carries the raw request, which can include a password.
  if (
    status >= 400 &&
    status < 500
  ) {
    return res
      .status(
        status
      )
      .json({
        error:
          status === 413
            ? 'This request is too large.'
            : 'This request could not be read. Please try again.',

        code:
          'BAD_REQUEST',
      });
  }

  console.error(
    'UNEXPECTED SERVER ERROR:',
    req.method,
    req.path,
    error?.stack ||
      error
  );

  return res
    .status(
      500
    )
    .json({
      error:
        'Something went wrong. Please try again.',

      code:
        'SERVER_ERROR',
    });
}

module.exports = {
  errorHandler,
};
