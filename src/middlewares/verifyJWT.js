const jwt = require('jsonwebtoken');
const allowedRoutes = require('./../config/allowedRoutes');
require('dotenv').config();

const verifyJwt = (req, res, next) => {
  const { authorization } = req.headers;
  const { originalUrl, method } = req;

  const isExcluded = allowedRoutes.some((route) => route.path === originalUrl && route.method.toUpperCase() === method.toUpperCase());

  if (isExcluded) {
    return next();
  }

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed token' });
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded?.userInfo?.email || null;
    next();
  });
};

module.exports = verifyJwt;
