const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "cognifyz-task6-local-dev-secret-key";
const COOKIE_NAME = "ledger_token";

function signAuthToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function readOptionalUser(req) {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return {
      id: Number(payload.sub),
      email: payload.email,
      name: payload.name
    };
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: "Authentication required. Sign in to access ledger records."
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
      name: payload.name
    };
    next();
  } catch {
    return res.status(401).json({
      error: "Session expired or invalid token. Please sign in again."
    });
  }
}

module.exports = {
  COOKIE_NAME,
  signAuthToken,
  readOptionalUser,
  requireAuth
};
