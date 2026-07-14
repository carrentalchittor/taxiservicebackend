function normalizeOrigin(value = "") {
  return String(value)
    .trim()
    .replace(/\/+$/, "");
}

const allowedOrigins = [
  "http://localhost:5173",
  "https://taxiservice-seven.vercel.app",
  "https://taxiservicechittorgarh.com",
  "https://www.taxiservicechittorgarh.com",
].map(normalizeOrigin);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".vercel.app") &&
      url.hostname.startsWith("taxiservice-")
    );
  } catch {
    return false;
  }
}

module.exports = function trustedOrigin(
  req,
  res,
  next
) {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(
      req.method
    )
  ) {
    return next();
  }

  const requestOrigin = normalizeOrigin(
    req.get("origin")
  );

  if (!isAllowedOrigin(requestOrigin)) {
    console.error(
      "Trusted origin blocked:",
      requestOrigin
    );

    return res.status(403).json({
      message: "Request origin is not allowed",
    });
  }

  next();
};