require("dotenv").config();
const crypto = require("crypto");
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

const { errorHandler, ValidationError, UpstreamApiError } = require("./middleware/errorHandler");
const { createSlidingWindowLimiter } = require("./middleware/rateLimiter");
const { getCitySnapshot } = require("./services/weatherService");
const oauth = require("./services/oauthService");

const app = express();
const PORT = process.env.PORT || 3007;
const SESSION_COOKIE = "skyline_sid";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || `http://localhost:${PORT}/auth/github/callback`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID().slice(0, 8);
  res.setHeader("X-Request-Id", req.requestId);
  req.oauthUser = oauth.getSession(req.cookies[SESSION_COOKIE]);
  next();
});

app.use(express.static(path.join(__dirname, "public")));

const weatherRateLimiter = createSlidingWindowLimiter({
  windowMs: 60 * 1000,
  guestLimit: 10,
  authLimit: 30
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Built-in RFC-6749 OAuth 2.0 Authorization Server Endpoints ---
app.get("/oauth/authorize", (req, res) => {
  const clientId = String(req.query.client_id || "");
  const redirectUri = String(req.query.redirect_uri || "");
  const scope = String(req.query.scope || "read:profile read:weather");
  const state = String(req.query.state || "");

  if (clientId !== oauth.LOCAL_CLIENT_ID || !redirectUri.startsWith("http")) {
    return res.status(400).send("Invalid OAuth client_id or redirect_uri.");
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" href="data:," />
  <title>OAuth 2.0 Consent &middot; Skyline Brief</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #eef2f6; color: #162333; display: grid; place-items: center; min-height: 100vh; padding: 16px; }
    .box { background: #fff; border: 1px solid #cfd9e3; border-radius: 8px; padding: 26px; max-width: 420px; width: 100%; }
    h1 { margin: 0 0 8px; font-size: 1.25rem; }
    p { margin: 0 0 14px; font-size: 0.92rem; color: #4d5f72; }
    label { display: block; font-size: 0.84rem; font-weight: 600; margin-bottom: 5px; }
    input[type="text"] { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #c3cfd9; border-radius: 5px; margin-bottom: 14px; font: inherit; }
    .scopes { background: #f6f9fc; border: 1px solid #dce5ee; border-radius: 5px; padding: 10px 12px; font-size: 0.85rem; margin-bottom: 16px; }
    .actions { display: flex; gap: 10px; }
    button, a { flex: 1; text-align: center; padding: 9px 14px; border-radius: 5px; font: inherit; font-size: 0.9rem; font-weight: 600; text-decoration: none; cursor: pointer; }
    button { background: #0369a1; color: #fff; border: none; }
    a { background: #f4f6f8; color: #162333; border: 1px solid #cfd9e3; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Authorize Application Access</h1>
    <p><strong>Skyline Brief</strong> requests OAuth 2.0 permission to read your identity and unlock higher API rate limits (30 req/min).</p>
    <div class="scopes">
      <strong>Requested Scopes:</strong><br />
      <code>${escapeHtml(scope)}</code>
    </div>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <label for="displayName">Account Display Name</label>
      <input type="text" id="displayName" name="displayName" value="Jeeviraj V" required />
      <div class="actions">
        <a href="/">Deny</a>
        <button type="submit">Approve &amp; Continue</button>
      </div>
    </form>
  </div>
</body>
</html>`);
});

app.post("/oauth/authorize", (req, res) => {
  const clientId = String(req.body.client_id || "");
  const redirectUri = String(req.body.redirect_uri || "");
  const scope = String(req.body.scope || "read:profile");
  const state = String(req.body.state || "");
  const displayName = String(req.body.displayName || "OAuth Developer").trim().slice(0, 60);

  const handle = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "dev-user";
  const code = oauth.issueAuthorizationCode({
    clientId,
    redirectUri,
    scope,
    user: {
      sub: `local:${handle}`,
      name: displayName,
      handle,
      provider: "Local OAuth 2.0 Provider"
    }
  });

  if (!code) {
    return res.status(400).send("Authorization request denied.");
  }

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  target.searchParams.set("state", state);
  res.redirect(target.toString());
});

app.post("/oauth/token", (req, res) => {
  const tokenPayload = oauth.exchangeLocalCode({
    code: req.body.code,
    clientId: req.body.client_id,
    clientSecret: req.body.client_secret,
    redirectUri: req.body.redirect_uri
  });

  if (!tokenPayload) {
    return res.status(400).json({ error: "invalid_grant" });
  }
  res.json(tokenPayload);
});

app.get("/oauth/userinfo", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const user = oauth.lookupLocalUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: "invalid_token" });
  }
  res.json(user);
});

// --- Client App OAuth Entry Points ---
app.get("/auth/local", (req, res) => {
  const state = oauth.createOAuthState("local");
  const redirectUri = `${req.protocol}://${req.get("host")}/auth/local/callback`;
  const url =
    `/oauth/authorize?response_type=code&client_id=${encodeURIComponent(oauth.LOCAL_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent("read:profile read:weather")}` +
    `&state=${encodeURIComponent(state)}`;
  res.redirect(url);
});

app.get("/auth/local/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !oauth.consumeOAuthState(state, "local")) {
      throw new ValidationError("Invalid or expired OAuth state parameter.");
    }

    const redirectUri = `${req.protocol}://${req.get("host")}/auth/local/callback`;
    const tokenResp = await fetch(`http://127.0.0.1:${PORT}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: oauth.LOCAL_CLIENT_ID,
        client_secret: oauth.LOCAL_CLIENT_SECRET,
        redirect_uri: redirectUri
      })
    });
    if (!tokenResp.ok) {
      throw new UpstreamApiError("OAuth Token Endpoint", "Authorization code exchange failed.");
    }
    const tokenData = await tokenResp.json();

    const profileResp = await fetch(`http://127.0.0.1:${PORT}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileResp.json();

    const sid = oauth.createSession(profile);
    res.cookie(SESSION_COOKIE, sid, { httpOnly: true, sameSite: "lax" });
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

app.get("/auth/github", (req, res, next) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return next(
      new ValidationError(
        "GitHub OAuth keys are not configured in .env. Use Built-in OAuth 2.0 or set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET."
      )
    );
  }
  const state = oauth.createOAuthState("github");
  const authUrl =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}` +
    "&scope=read:user" +
    `&state=${encodeURIComponent(state)}`;
  res.redirect(authUrl);
});

app.get("/auth/github/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !oauth.consumeOAuthState(state, "github")) {
      throw new ValidationError("GitHub OAuth state mismatch.");
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_CALLBACK_URL
      })
    });
    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) {
      throw new UpstreamApiError("GitHub OAuth", "No access token returned.");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "User-Agent": "SkylineBrief-OAuth-App"
      }
    });
    const ghUser = await userRes.json();

    const sid = oauth.createSession({
      sub: `github:${ghUser.id}`,
      name: ghUser.name || ghUser.login,
      handle: ghUser.login,
      provider: "GitHub OAuth 2.0"
    });
    res.cookie(SESSION_COOKIE, sid, { httpOnly: true, sameSite: "lax" });
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

app.get("/api/auth/session", (req, res) => {
  res.json({
    user: req.oauthUser,
    githubConfigured: Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
    tierLimit: req.oauthUser ? 30 : 10
  });
});

app.post("/api/auth/logout", (req, res) => {
  oauth.deleteSession(req.cookies[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

app.get("/api/weather", weatherRateLimiter, async (req, res, next) => {
  try {
    const snapshot = await getCitySnapshot(req.query.city);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Task 7 Skyline Brief (External API + OAuth + Rate Limit) running at http://localhost:${PORT}`);
});
