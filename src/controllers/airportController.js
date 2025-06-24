const { session } = require('../config/db');
const { logger } = require('../middlewares/logger');
require('dotenv').config();

const getAllAirports = async (req, res) => {
  try {
    const result = await session.run(`MATCH (a:Airport) RETURN a.id AS id, a.city AS city, a.country AS country, a.image AS image`);

    const airports = result.records.map((record) => ({
      id: record.get('id'),
      city: record.get('city'),
      country: record.get('country'),
      image: record.get('image'),
    }));
    res.status(200).json(airports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllAirports,
};
