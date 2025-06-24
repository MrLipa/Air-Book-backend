import request from 'supertest';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../src/config/db.js';

describe('GET /logout', () => {
  let refreshToken;
  let userId;
  const testUser = {
    email: 'xavier1@gmail.com',
    role: 'admin',
    firstName: 'Xavier',
    lastName: 'Testowy',
    password: 'test1234',
  };

  beforeEach(async () => {
    userId = uuidv4();

    await pool.execute(
      'INSERT INTO users (id, first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userId,
        testUser.firstName,
        testUser.lastName,
        testUser.email,
        'dummyhash',
        testUser.role
      ]
    );

    const payload = {
      userInfo: {
        userId,
        email: testUser.email,
        role: testUser.role,
      },
    };

    const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);
    refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: refreshExpiry,
    });

    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + refreshExpiry);
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(
      'INSERT INTO tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, userId, refreshToken, expiresAtStr]
    );
  });

  afterEach(async () => {
    try {
      await pool.execute('DELETE FROM tokens WHERE refresh_token = ?', [refreshToken]);
      await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    } catch (err) {
      console.error('Error cleaning up test data:', err);
    }
  });

  it('✅ should clear the cookie and remove the token from DB', async () => {
    const res = await request(app)
      .get('/logout')
      .set('Cookie', [`jwt=${refreshToken}`]);

    expect(res.status).to.equal(200);
    expect(res.body.message).to.include('User logout');
    expect(res.headers['set-cookie']).to.exist;
    expect(res.headers['set-cookie'][0]).to.include('jwt=;');

    const [rows] = await pool.execute('SELECT * FROM tokens WHERE refresh_token = ?', [refreshToken]);
    expect(rows.length).to.equal(0);
  });

  it('✅ should clear the cookie and return custom message if token is not found in DB', async () => {
    await pool.execute('DELETE FROM tokens WHERE refresh_token = ?', [refreshToken]);

    const res = await request(app)
      .get('/logout')
      .set('Cookie', [`jwt=${refreshToken}`]);

    expect(res.status).to.equal(200);
    expect(res.body.message).to.include('not found');
    expect(res.headers['set-cookie']).to.exist;
    expect(res.headers['set-cookie'][0]).to.include('jwt=;');
  });

  it('✅ should return 204 if no cookie is present', async () => {
    const res = await request(app).get('/logout');
    expect(res.status).to.equal(204);
    expect(res.body).to.deep.equal({});
  });

  it('❌ should return 403 if token is malformed', async () => {
    const res = await request(app)
      .get('/logout')
      .set('Cookie', ['jwt=invalid_token_value']);

    expect(res.status).to.equal(403);
    expect(res.body.message).to.include('Invalid refresh token');
    expect(res.headers['set-cookie']).to.exist;
    expect(res.headers['set-cookie'][0]).to.include('jwt=;');
  });

  it('❌ should return 500 on DB error', async () => {
    const origExecute = pool.execute;
    pool.execute = () => { throw new Error('DB fail'); };

    const res = await request(app)
      .get('/logout')
      .set('Cookie', [`jwt=${refreshToken}`]);

    expect(res.status).to.equal(500);
    expect(res.body.message).to.include('Internal server error');

    pool.execute = origExecute;
  });
});
