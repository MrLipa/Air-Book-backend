const allowedOrigins = require('../config/allowedOrigins');

const credentials = (req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Credentials', true);
  }
  next();
};

module.exports = credentials;
