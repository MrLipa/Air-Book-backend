const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { usersOnline } = require('../monitoring/metrics');

const logoutUser = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    return res.status(204).json({ message: 'No JWT cookie provided' });
  }

  const refreshToken = cookies.jwt;

  res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err) => {
    if (err) {
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    try {
      const [foundToken] = await pool.execute(`SELECT * FROM tokens WHERE refresh_token = ?`, [refreshToken]);

      if (foundToken.length === 0) {
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
        return res.status(200).json({ message: 'User logout (token not found in DB)' });
      }

      await pool.execute('DELETE FROM tokens WHERE refresh_token = ?', [refreshToken]);

      usersOnline.dec();

      return res.status(200).json({ message: 'User logout successful' });
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
};

module.exports = {
  logoutUser,
};
