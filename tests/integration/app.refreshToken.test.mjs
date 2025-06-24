import request from 'supertest';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import app from '../../src/app.js';
import { pool } from '../../src/config/db.js';

describe('GET /refreshToken', () => {
  let validRefreshToken;
  let userEmail;

  const userId = '01cbee36-53b2-48be-aabc-4ff6b236c191';
  const testRole = 'admin';

  beforeEach(async () => {
    await pool.execute('DELETE FROM tokens WHERE user_id = ?', [userId]);

    userEmail = `xavier${Math.floor(Math.random() * 10000)}@gmail.com`;

    await pool.execute(
      `INSERT INTO users
        (id, first_name, last_name, email, password, image, phone, address, description, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE email=VALUES(email)`,
      [
        userId,
        'Xavier',
        'Test',
        userEmail,
        '$2b$10$abcabcabcabcabcabcabcOYX2WyVf6wDqOIGnXmk0ixJMH6ALQpwi',
        'img.png',
        '123456789',
        'Test Address',
        'desc',
        testRole,
      ]
    );

    const payload = {
      userInfo: {
        userId,
        email: userEmail,
        role: testRole,
      },
    };

    const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);

    validRefreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: refreshExpiry,
    });

    await pool.execute(
      'INSERT INTO tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [
        uuidv4(),
        userId,
        validRefreshToken,
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ]
    );
  });

  afterEach(async () => {
    try {
      if (validRefreshToken) {
        await pool.execute('DELETE FROM tokens WHERE refresh_token = ?', [validRefreshToken]);
      }
    } catch (err) {
      if (err.message !== 'DB FAIL') {
        console.error('Error cleaning up after tests:', err);
      }
    }
  });

  it('✅ should return new access token for valid refresh token', async () => {
    const res = await request(app)
      .get('/refreshToken')
      .set('Cookie', [`jwt=${validRefreshToken}`]);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken').that.is.a('string');
    expect(res.body).to.have.property('userId', userId);
    expect(res.body).to.have.property('role', testRole);
    expect(res.body.message).to.include('refreshed');
    expect(res.headers['set-cookie']).to.exist;
    expect(res.headers['set-cookie'][0]).to.include('jwt=');
  });

  it('❌ should return 401 if no cookie is present', async () => {
    const res = await request(app).get('/refreshToken');
    expect(res.status).to.equal(401);
    expect(res.body.message).to.include('No JWT cookie');
  });

  it('❌ should return 403 if token is invalid', async () => {
    const res = await request(app)
      .get('/refreshToken')
      .set('Cookie', ['jwt=invalid_token_value']);

    expect(res.status).to.equal(403);
    expect(res.body.message).to.include('Invalid refresh token');
  });

  it('❌ should return 403 if refresh token not found or already used', async () => {
    const fakePayload = {
      userInfo: {
        userId: uuidv4(),
        email: 'nonexistent@example.com',
        role: 'user',
      },
    };

    const fakeToken = jwt.sign(fakePayload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '1h',
    });

    const res = await request(app)
      .get('/refreshToken')
      .set('Cookie', [`jwt=${fakeToken}`]);

    expect(res.status).to.equal(403);
    expect(res.body.message).to.include('Refresh token not found');
  });

  it('❌ should return 500 on database error', async () => {
    const origExecute = pool.execute;
    pool.execute = () => { throw new Error('DB FAIL'); };
    try {
      const res = await request(app)
        .get('/refreshToken')
        .set('Cookie', [`jwt=${validRefreshToken}`]);
      expect(res.status).to.equal(500);
      expect(res.body.message).to.include('Internal server error');
    } finally {
      pool.execute = origExecute;
    }
  });

  it('❌ should return 403 if refresh token is correct but email in token is wrong', async () => {
    const badPayload = {
      userInfo: {
        userId,
        email: 'wrong@example.com',
        role: testRole,
      },
    };

    const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);

    const badToken = jwt.sign(badPayload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: refreshExpiry,
    });

    await pool.execute('INSERT INTO tokens (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)', [
      uuidv4(),
      userId,
      badToken,
      new Date(Date.now() + 7 * 24 * 3600 * 1000),
    ]);

    const res = await request(app)
      .get('/refreshToken')
      .set('Cookie', [`jwt=${badToken}`]);

    expect(res.status).to.equal(403);
    expect(res.body.message).to.include('Refresh token not found');

    await pool.execute('DELETE FROM tokens WHERE refresh_token = ?', [badToken]);
  });

  it('❌ should return 403 if refresh token was already used and deleted', async () => {
    await request(app)
      .get('/refreshToken')
      .set('Cookie', [`jwt=${validRefreshToken}`]);
    const res = await request(app)
      .get('/refreshToken')
      .set('Cookie', [`jwt=${validRefreshToken}`]);
    expect(res.status).to.equal(403);
    expect(res.body.message).to.include('Refresh token not found');
  });
});
