const neo4j = require('neo4j-driver');
const mysql = require('mysql2/promise');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: {
    rejectUnauthorized: isProduction,
  },
});

const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
const neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
const session = neo4jDriver.session();

module.exports = {
  pool,
  session,
};
