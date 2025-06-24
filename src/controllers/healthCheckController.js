const { pool, session } = require('../config/db');
require('dotenv').config();

const checkRelationalDatabase = async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).send('✅ Relational database OK');
  } catch (error) {
    res.status(500).send(`❌ Relational database error: ${error.message}`);
  }
};

const checkNeo4j = async (req, res) => {
  try {
    await session.run('RETURN 1');
    res.status(200).send('✅ Neo4j OK');
  } catch (error) {
    res.status(500).send(`❌ Neo4j error: ${error.message}`);
  }
};

module.exports = {
  checkRelationalDatabase,
  checkNeo4j,
};
