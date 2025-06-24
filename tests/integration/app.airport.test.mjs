import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import pkg from '../../src/utils/generateToken.js';
const { session } = await import('../../src/config/db.js');
const { generateAccessToken } = pkg;

const adminToken = generateAccessToken({
  userId: 1,
  email: 'admin@example.com',
  role: 'admin',
});

const userToken = generateAccessToken({
  userId: 2,
  email: 'user@example.com',
  role: 'user',
});

describe('GET /airport/getAllAirports', () => {
  it('should respond with 200 and return a list of airports in correct format', async () => {
    const response = await request(app)
      .get('/airport/getAllAirports')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    const airports = response.body;
    expect(airports).to.be.an('array');

    airports.forEach((airport) => {
      expect(airport).to.be.an('object');
      expect(airport).to.have.all.keys('id', 'city', 'country', 'image');
      expect(airport.id).to.be.a('string');
      expect(airport.city).to.be.a('string');
      expect(airport.country).to.be.a('string');
      expect(airport.image).to.be.a('string');
    });
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app).get('/airport/getAllAirports').expect(401);

    expect(response.body).to.have.property('message', 'Missing or malformed token');
  });

  it('should return 403 if user has insufficient role', async () => {
    const response = await request(app)
      .get('/airport/getAllAirports')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(response.body).to.have.property('message').that.includes('insufficient permissions');
  });

  it('should return 403 for invalid token', async () => {
    const response = await request(app)
      .get('/airport/getAllAirports')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(403);

    expect(response.body).to.have.property('message', 'Invalid or expired token');
  });

  it('should return 500 on server/database error', async () => {
    const originalRun = session.run;
    session.run = () => { throw new Error('Database is down'); };

    const response = await request(app)
      .get('/airport/getAllAirports')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500);

    expect(response.body).to.have.property('error').that.is.a('string');

    session.run = originalRun;
  });
});
