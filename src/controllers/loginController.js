const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { usersOnline } = require('../monitoring/metrics');
require('dotenv').config();

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ code: 400, message: 'Email and password are required.' });
  }

  try {
    const [foundUserQuery] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (foundUserQuery.length === 0) {
      return res.status(401).json({ code: 401, message: 'Invalid email or password.' });
    }

    const user = foundUserQuery[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ code: 401, message: 'Invalid email or password.' });
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

    return res.status(200).json({
      code: 200,
      message: 'Login successful.',
      accessToken,
      userId: user.id,
      role: user.role,
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: err.message || 'Internal server error.' });
  }
};

module.exports = {
  loginUser,
};
