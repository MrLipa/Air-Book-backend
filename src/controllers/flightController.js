const { pool, session } = require('../config/db');
require('dotenv').config();

const getAllFlights = async (req, res) => {
  try {
    const result = await session.run(`
      MATCH (a:Airport)-[r:Flight]->(b:Airport)
      RETURN r.id, a.country, a.city, a.image, b.country, b.city, b.image, r.distance, r.date, r.price, r.duration, r.airlines, r.class, r.free_seats
    `);

    const flights = result.records.map((record) => ({
      id: record.get('r.id'),
      originCountry: record.get('a.country'),
      originCity: record.get('a.city'),
      originImage: record.get('a.image'),
      destinationCountry: record.get('b.country'),
      destinationCity: record.get('b.city'),
      destinationImage: record.get('b.image'),
      distance: record.get('r.distance').low,
      date: record.get('r.date'),
      price: record.get('r.price').low,
      duration: record.get('r.duration'),
      airlines: record.get('r.airlines'),
      flightClass: record.get('r.class'),
      freeSeats: record.get('r.free_seats').low,
    }));

    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const searchFlights = async (req, res) => {
  try {
    const cityFrom = req.body.cityFrom || '';
    const cityTo = req.body.cityTo || '';

    let query = '';
    let parameters = {};

    if (!cityFrom && !cityTo) {
      query = `
        MATCH (a:Airport)-[r:Flight]->(b:Airport)
        RETURN r.id, a.country, a.city, a.image, b.country, b.city, b.image, r.distance, r.date, r.price, r.duration, r.airlines, r.class, r.free_seats
      `;
    } else if (cityFrom && !cityTo) {
      query = `
        MATCH (a:Airport)-[r:Flight]->(b:Airport)
        WHERE a.city = $city_from
        RETURN r.id, a.country, a.city, a.image, b.country, b.city, b.image, r.distance, r.date, r.price, r.duration, r.airlines, r.class, r.free_seats
      `;
      parameters = { city_from: cityFrom };
    } else if (!cityFrom && cityTo) {
      query = `
        MATCH (a:Airport)-[r:Flight]->(b:Airport)
        WHERE b.city = $city_to
        RETURN r.id, a.country, a.city, a.image, b.country, b.city, b.image, r.distance, r.date, r.price, r.duration, r.airlines, r.class, r.free_seats
      `;
      parameters = { city_to: cityTo };
    } else {
      query = `
        MATCH (a:Airport)-[r:Flight]->(b:Airport)
        WHERE a.city = $city_from AND b.city = $city_to
        RETURN r.id, a.country, a.city, a.image, b.country, b.city, b.image, r.distance, r.date, r.price, r.duration, r.airlines, r.class, r.free_seats
      `;
      parameters = { city_from: cityFrom, city_to: cityTo };
    }

    const result = await session.run(query, parameters);

    const flights = result.records.map((record) => ({
      id: record.get('r.id'),
      originCountry: record.get('a.country'),
      originCity: record.get('a.city'),
      originImage: record.get('a.image'),
      destinationCountry: record.get('b.country'),
      destinationCity: record.get('b.city'),
      destinationImage: record.get('b.image'),
      distance: record.get('r.distance').low,
      date: record.get('r.date'),
      price: record.get('r.price').low,
      duration: record.get('r.duration'),
      airlines: record.get('r.airlines'),
      flightClass: record.get('r.class'),
      freeSeats: record.get('r.free_seats').low,
    }));

    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFlightsByIds = async (req, res) => {
  try {
    const { flightIds } = req.body;

    const result = await session.run(
      `MATCH (a:Airport)-[r:Flight]->(b:Airport)
       WHERE r.id IN $flight_ids
       RETURN r.id, a.country, a.city, a.image, b.country, b.city, b.image, r.distance, r.date, r.price, r.duration, r.airlines, r.class, r.free_seats`,
      { flight_ids: flightIds }
    );

    const flights = result.records.map((record) => ({
      id: record.get('r.id'),
      originCountry: record.get('a.country'),
      originCity: record.get('a.city'),
      originImage: record.get('a.image'),
      destinationCountry: record.get('b.country'),
      destinationCity: record.get('b.city'),
      destinationImage: record.get('b.image'),
      distance: record.get('r.distance').low,
      date: record.get('r.date'),
      price: record.get('r.price').low,
      duration: record.get('r.duration'),
      airlines: record.get('r.airlines'),
      flightClass: record.get('r.class'),
      freeSeats: record.get('r.free_seats').low,
    }));

    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFlightsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const [dbResult] = await pool.execute(
      `SELECT id AS reservation_id, flight_id
       FROM reservations
       WHERE user_id = ?`,
      [userId]
    );

    if (dbResult.length === 0) {
      return res.json([]);
    }

    const reservations = dbResult;
    const flightIds = [...new Set(reservations.map((r) => r.flight_id))];

    const result = await session.run(
      `MATCH (a:Airport)-[r:Flight]->(b:Airport)
       WHERE r.id IN $flight_ids
       RETURN r.id AS id, a.country AS origin_country, a.city AS origin_city, a.image AS origin_image, b.country AS destination_country, b.city AS destination_city, b.image AS destination_image, r.distance AS distance, r.date AS date, r.price AS price, r.duration AS duration, r.airlines AS airlines, r.class AS class, r.free_seats AS free_seats`,
      { flight_ids: flightIds }
    );

    const flightsMap = {};
    for (const record of result.records) {
      const flightId = record.get('id');
      flightsMap[flightId] = {
        id: flightId,
        originCountry: record.get('origin_country'),
        originCity: record.get('origin_city'),
        originImage: record.get('origin_image'),
        destinationCountry: record.get('destination_country'),
        destinationCity: record.get('destination_city'),
        destinationImage: record.get('destination_image'),
        distance: record.get('distance').low,
        date: record.get('date'),
        price: record.get('price').low,
        duration: record.get('duration'),
        airlines: record.get('airlines'),
        flightClass: record.get('class'),
        freeSeats: record.get('free_seats').low,
      };
    }

    const response = reservations.map(({ reservation_id, flight_id }) => ({
      reservationId: reservation_id,
      ...flightsMap[flight_id],
    }));

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const patchFlightById = async (req, res) => {
  try {
    const flightId = req.params.flightId;
    const updateFields = req.body;

    const camelToSnake = (str) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

    let cypherQuery = `MATCH (a:Airport)-[r:Flight]->(b:Airport) WHERE r.id = $flight_id SET `;
    const params = { flight_id: flightId };

    Object.entries(updateFields).forEach(([key, value], index) => {
      const snakeKey = camelToSnake(key);
      cypherQuery += `r.${snakeKey} = $param${index}, `;
      params[`param${index}`] = value;
    });

    cypherQuery = cypherQuery.slice(0, -2);
    cypherQuery += ' RETURN r';

    await session.run(cypherQuery, params);

    res.status(200).json({ message: 'Flight updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllFlights,
  searchFlights,
  getFlightsByIds,
  getFlightsByUserId,
  patchFlightById,
};
