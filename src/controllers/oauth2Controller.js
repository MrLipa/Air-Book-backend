const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { usersOnline } = require('../monitoring/metrics');
require('dotenv').config();
const axios = require('axios');

const FRONTEND_URL = process.env.FRONTEND_URL;

const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI;

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_REDIRECT_URI = process.env.AZURE_REDIRECT_URI;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;

const facebookCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=missing_code`);

  try {
    const tokenResp = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&client_secret=${FACEBOOK_CLIENT_SECRET}&code=${code}`);
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=token_error`);

    const userResp = await fetch(`https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${tokenData.access_token}`);
    const userData = await userResp.json();
    if (!userData.email) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=no_email`);

    const [foundUserQuery] = await pool.execute('SELECT * FROM users WHERE email = ?', [userData.email]);

    let user;
    if (foundUserQuery.length === 0) {
      const userId = crypto.randomUUID();
      const fakePassword = crypto.randomUUID();
      await pool.execute(
        `INSERT INTO users
         (id, first_name, last_name, email, password, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, userData.first_name || 'Facebook', userData.last_name || 'User', userData.email, fakePassword, 'admin']
      );
      user = { id: userId, email: userData.email, role: 'admin' };
    } else {
      user = foundUserQuery[0];
    }

    const payload = {
      userInfo: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
    };

    const accessExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY);
    const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: accessExpiry,
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: refreshExpiry,
    });

    await pool.execute('DELETE FROM tokens WHERE user_id = ?', [user.id]);

    const expiresAt = new Date(Date.now() + refreshExpiry);

    await pool.execute(
      'INSERT INTO tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, refreshToken, expiresAt]
    );

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: parseInt(process.env.COOKIE_MAX_AGE),
    });

    usersOnline.inc();

    return res.redirect(`${FRONTEND_URL}/oauth-success?accessToken=${accessToken}&userId=${user.id}&role=${user.role}`);
  } catch {
    return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=server_error`);
  }
};

const linkedinCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=missing_code`);

  try {
    const tokenResp = await fetch(
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: LINKEDIN_REDIRECT_URI,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        }),
      }
    );
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=token_error`);

    const userResp = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResp.json();

    if (!userData.email) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=no_email`);

    const [foundUserQuery] = await pool.execute('SELECT * FROM users WHERE email = ?', [userData.email]);

    let user;
    if (foundUserQuery.length === 0) {
      const userId = crypto.randomUUID();
      const fakePassword = crypto.randomUUID();
      await pool.execute(
        `INSERT INTO users
         (id, first_name, last_name, email, password, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, userData.given_name || 'LinkedIn', userData.family_name || 'User', userData.email, fakePassword, 'admin']
      );
      user = { id: userId, email: userData.email, role: 'admin' };
    } else {
      user = foundUserQuery[0];
    }

    const payload = {
      userInfo: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
    };

    const accessExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY);
    const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: accessExpiry,
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: refreshExpiry,
    });

    await pool.execute('DELETE FROM tokens WHERE user_id = ?', [user.id]);

    const expiresAt = new Date(Date.now() + refreshExpiry);

    await pool.execute(
      'INSERT INTO tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, refreshToken, expiresAt]
    );

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: parseInt(process.env.COOKIE_MAX_AGE),
    });

    usersOnline.inc();

    return res.redirect(`${FRONTEND_URL}/oauth-success?accessToken=${accessToken}&userId=${user.id}&role=${user.role}`);
  } catch {
    return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=server_error`);
  }
};

const githubCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=missing_code`);

  try {
    const tokenResp = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: GITHUB_REDIRECT_URI,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );
    const access_token = tokenResp.data.access_token;
    if (!access_token) {
      return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=token_error`);
    }

    const userResp = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const emailsResp = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const primaryEmailObj = emailsResp.data.find((e) => e.primary && e.verified);
    const email = primaryEmailObj ? primaryEmailObj.email : null;

    if (!email) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=no_email`);

    const [foundUserQuery] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

    let user;
    if (foundUserQuery.length === 0) {
      const userId = crypto.randomUUID();
      const fakePassword = crypto.randomUUID();
      const nameParts = userResp.data.name ? userResp.data.name.split(' ') : [];
      const firstName = nameParts[0] || 'GitHub';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      await pool.execute(
        `INSERT INTO users
         (id, first_name, last_name, email, password, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, firstName, lastName, email, fakePassword, 'admin']
      );
      user = { id: userId, email: email, role: 'admin' };
    } else {
      user = foundUserQuery[0];
    }

    const payload = {
      userInfo: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
    };

    const accessExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY);
    const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: accessExpiry,
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: refreshExpiry,
    });

    await pool.execute('DELETE FROM tokens WHERE user_id = ?', [user.id]);

    const expiresAt = new Date(Date.now() + refreshExpiry);

    await pool.execute(
      'INSERT INTO tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, refreshToken, expiresAt]
    );

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: parseInt(process.env.COOKIE_MAX_AGE),
    });

    usersOnline.inc();

    return res.redirect(`${FRONTEND_URL}/oauth-success?accessToken=${accessToken}&userId=${user.id}&role=${user.role}`);
  } catch {
    return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=server_error`);
  }
};

const azureCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=missing_code`);

  try {
    const params = new URLSearchParams();
    params.append('client_id', AZURE_CLIENT_ID);
    params.append('scope', 'api://11323a23-34eb-4e9c-8860-9b4971e5aeb0');
    params.append('code', code);
    params.append('redirect_uri', AZURE_REDIRECT_URI);
    params.append('grant_type', 'authorization_code');
    params.append('client_secret', AZURE_CLIENT_SECRET);

    const tokenResp = await axios.post(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/token`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });

    const access_token = tokenResp.data.access_token;
    if (!access_token) {
      return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=token_error`);
    }

    const userResp = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
      },
    });
    const userData = userResp.data;

    let email = userData.mail;
    if (!email && userData.userPrincipalName) {
      const upn = userData.userPrincipalName;
      const match = upn.match(/^(.+?)#EXT#@/);
      if (match) {
        email = match[1].replace('_', '@');
        if (!email.includes('@') && email.includes('%40')) {
          email = email.replace('%40', '@');
        }
      } else {
        email = upn;
      }
    }
    const firstName = userData.givenName || 'Azure';
    const lastName = userData.surname || 'User';

    const [foundUserQuery] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    let user;
    if (foundUserQuery.length === 0) {
      const userId = crypto.randomUUID();
      const fakePassword = crypto.randomUUID();
      await pool.execute(
        `INSERT INTO users
         (id, first_name, last_name, email, password, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, firstName, lastName, email, fakePassword, 'admin']
      );
      user = { id: userId, email: email, role: 'admin' };
    } else {
      user = foundUserQuery[0];
    }

    const payload = {
      userInfo: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
    };

    const accessExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY);
    const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: accessExpiry,
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: refreshExpiry,
    });

    await pool.execute('DELETE FROM tokens WHERE user_id = ?', [user.id]);

    const expiresAt = new Date(Date.now() + refreshExpiry);

    await pool.execute(
      'INSERT INTO tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, refreshToken, expiresAt]
    );

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: parseInt(process.env.COOKIE_MAX_AGE),
    });

    usersOnline.inc();

    return res.redirect(`${FRONTEND_URL}/oauth-success?accessToken=${accessToken}&userId=${user.id}&role=${user.role}`);
  } catch {
    return res.redirect(`${FRONTEND_URL}/oauth-fail?reason=server_error`);
  }
};

module.exports = {
  facebookCallback,
  linkedinCallback,
  githubCallback,
  azureCallback,
};
