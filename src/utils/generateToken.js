const jwt = require('jsonwebtoken');
import dotenv from 'dotenv';
dotenv.config();

function generateAccessToken(userPayload) {
  const accessExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY);

  return jwt.sign({ userInfo: userPayload }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: accessExpiry,
  });
}

module.exports = { generateAccessToken };
