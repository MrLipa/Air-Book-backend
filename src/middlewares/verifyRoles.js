const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }

      const userRole = decoded.userInfo?.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }

      req.user = {
        id: decoded.userInfo.userId,
        email: decoded.userInfo.email,
        role: userRole,
      };

      next();
    });
  };
};

module.exports = verifyRoles;
