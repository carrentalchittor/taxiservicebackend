function normalizeOrigin(value = "") {
  return String(value)
    .trim()
    .replace(/\/+$/, "");
}

module.exports = function trustedOrigin(
  req,
  res,
  next
) {
  const safeMethods = [
    "GET",
    "HEAD",
    "OPTIONS",
  ];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const requestOrigin = normalizeOrigin(
    req.get("origin")
  );

  const allowedOrigins = [
    "http://localhost:5173",
    normalizeOrigin(
      process.env.FRONTEND_URL
    ),
  ].filter(Boolean);

  if (
    !requestOrigin ||
    !allowedOrigins.includes(requestOrigin)
  ) {
    return res.status(403).json({
      message: "Request origin is not allowed",
    });
  }

  next();
};