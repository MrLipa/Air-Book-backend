const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const refreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) {
    return res.status(401).json({ message: 'No JWT cookie provided' });
  }

  const oldRefreshToken = cookies.jwt;

  jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    try {
      const [foundUser] = await pool.execute(
        `SELECT u.* FROM users u
         JOIN tokens t ON u.id = t.user_id
         WHERE t.refresh_token = ? AND u.email = ?`,
        [oldRefreshToken, decoded.userInfo.email]
      );

      if (foundUser.length === 0) {
        return res.status(403).json({ message: 'Refresh token not found or already used' });
      }
      const user = foundUser[0];

      await pool.execute('DELETE FROM tokens WHERE user_id = ?', [user.id]);

      res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });

      const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);
      const accessExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY);

      const newRefreshToken = jwt.sign(
        {
          userInfo: {
            userId: user.id,
            email: user.email,
            role: user.role,
          },
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: refreshExpiry }
      );

      const expiresAt = new Date(Date.now() + refreshExpiry);
      await pool.execute('INSERT INTO tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)', [uuidv4(), user.id, newRefreshToken, expiresAt]);

      const newAccessToken = jwt.sign(
        {
          userInfo: {
            userId: user.id,
            email: user.email,
            role: user.role,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: accessExpiry }
      );

      res.cookie('jwt', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: parseInt(process.env.COOKIE_MAX_AGE),
      });

      return res.status(200).json({
        code: 200,
        message: 'Access token refreshed successfully',
        accessToken: newAccessToken,
        userId: user.id,
        role: user.role,
      });
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
};

module.exports = {
  refreshToken,
};
