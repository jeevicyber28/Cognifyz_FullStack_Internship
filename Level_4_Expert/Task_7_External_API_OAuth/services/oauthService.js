const crypto = require("crypto");

const LOCAL_CLIENT_ID = "skyline-brief-web";
const LOCAL_CLIENT_SECRET = "skyline-local-oauth-secret";

const pendingStates = new Map();
const authCodes = new Map();
const activeTokens = new Map();
const sessions = new Map();

function createOAuthState(provider) {
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, { provider, createdAt: Date.now() });
  return state;
}

function consumeOAuthState(state, expectedProvider) {
  const entry = pendingStates.get(state);
  pendingStates.delete(state);
  if (!entry || entry.provider !== expectedProvider) {
    return false;
  }
  return Date.now() - entry.createdAt < 10 * 60 * 1000;
}

function issueAuthorizationCode({ clientId, redirectUri, scope, user }) {
  if (clientId !== LOCAL_CLIENT_ID) {
    return null;
  }
  const code = crypto.randomBytes(18).toString("hex");
  authCodes.set(code, {
    clientId,
    redirectUri,
    scope,
    user,
    expiresAt: Date.now() + 5 * 60 * 1000
  });
  return code;
}

function exchangeLocalCode({ code, clientId, clientSecret, redirectUri }) {
  const record = authCodes.get(code);
  authCodes.delete(code);

  if (!record || record.expiresAt < Date.now()) {
    return null;
  }
  if (record.clientId !== clientId || clientSecret !== LOCAL_CLIENT_SECRET || record.redirectUri !== redirectUri) {
    return null;
  }

  const accessToken = crypto.randomBytes(24).toString("hex");
  activeTokens.set(accessToken, {
    user: record.user,
    scope: record.scope,
    issuedAt: Date.now()
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: record.scope
  };
}

function lookupLocalUserByToken(accessToken) {
  const entry = activeTokens.get(accessToken);
  return entry ? { ...entry.user, scope: entry.scope } : null;
}

function createSession(user) {
  const sid = crypto.randomBytes(20).toString("hex");
  sessions.set(sid, { user, createdAt: Date.now() });
  return sid;
}

function getSession(sid) {
  if (!sid) return null;
  const entry = sessions.get(sid);
  return entry ? entry.user : null;
}

function deleteSession(sid) {
  if (sid) sessions.delete(sid);
}

module.exports = {
  LOCAL_CLIENT_ID,
  LOCAL_CLIENT_SECRET,
  createOAuthState,
  consumeOAuthState,
  issueAuthorizationCode,
  exchangeLocalCode,
  lookupLocalUserByToken,
  createSession,
  getSession,
  deleteSession
};
