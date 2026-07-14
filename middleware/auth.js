const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const authorization = req.headers.authorization || "";

  const bearerToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  const cookieToken = req.cookies?.authToken;

  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({
      message: "Please login first",
    });
  }

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired. Please login again.",
    });
  }
};