import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, session } from '../../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSQL(file) {
  const sqlPath = path.resolve(__dirname, `../../database/${file}`);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    if (stmt.length > 0) {
      await pool.query(stmt);
    }
  }
}

async function runCypher(file) {
  const cypherPath = path.resolve(__dirname, `../../database/${file}`);
  const cypher = fs.readFileSync(cypherPath, 'utf8');
  const statements = cypher
    .split(/;\s*\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await session.run(stmt);
  }
}

before(async function () {
  this.timeout(20000);
  await runSQL('schema.sql');
  await runSQL('seed.sql');
  await runCypher('erd.cypher');
});

after(async function () {
  this.timeout(20000);
  await runSQL('schema.sql');
  await runSQL('seed.sql');
  await runCypher('erd.cypher');
});
