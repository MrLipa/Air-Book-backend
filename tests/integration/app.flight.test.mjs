import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import pkg from '../../src/utils/generateToken.js';
const { session } = await import('../../src/config/db.js');
const { generateAccessToken } = pkg;

const token = generateAccessToken({
  userId: 1,
  email: 'admin@example.com',
  role: 'admin',
});

const exampleFlightId = 'b10e200c-98d5-44be-acc0-96382d870111';
const exampleUserId = 'e00f9902-50e7-40a8-89db-df54e1dbf555';

describe('Flight Routes', () => {

  describe('GET /flight/getAllFlights', () => {
    it('✅ should return an array of flights', async () => {
      const res = await request(app)
        .get('/flight/getAllFlights')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      if (res.body.length) {
        expect(res.body[0]).to.include.keys(
          'id', 'originCountry', 'originCity', 'originImage',
          'destinationCountry', 'destinationCity', 'destinationImage',
          'distance', 'date', 'price', 'duration', 'airlines', 'flightClass', 'freeSeats'
        );
      }
    });

    it('❌ should return 401 if no token', async () => {
      const res = await request(app)
        .get('/flight/getAllFlights')
        .expect(401);

      expect(res.body).to.have.property('message');
    });

    it('❌ should return 500 if session throws error', async () => {
      const origRun = session.run;
      session.run = () => { throw new Error('Neo4j fail'); };

      const res = await request(app)
        .get('/flight/getAllFlights')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(500);
      expect(res.body.message).to.include('Neo4j fail');

      session.run = origRun;
    });
  });

  describe('POST /flight/searchFlights', () => {
    it('✅ should search and return all flights if no params', async () => {
      const res = await request(app)
        .post('/flight/searchFlights')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(res.body).to.be.an('array');
    });

    it('✅ should search by cityFrom', async () => {
      const res = await request(app)
        .post('/flight/searchFlights')
        .set('Authorization', `Bearer ${token}`)
        .send({ cityFrom: 'Krakow' })
        .expect(200);

      expect(res.body).to.be.an('array');
      if (res.body.length)
        expect(res.body[0]).to.have.property('originCity', 'Krakow');
    });

    it('✅ should search by cityTo', async () => {
      const res = await request(app)
        .post('/flight/searchFlights')
        .set('Authorization', `Bearer ${token}`)
        .send({ cityTo: 'Warsaw' })
        .expect(200);

      expect(res.body).to.be.an('array');
      if (res.body.length)
        expect(res.body[0]).to.have.property('destinationCity', 'Warsaw');
    });

    it('✅ should search by cityFrom and cityTo', async () => {
      const res = await request(app)
        .post('/flight/searchFlights')
        .set('Authorization', `Bearer ${token}`)
        .send({ cityFrom: 'Krakow', cityTo: 'Warsaw' })
        .expect(200);

      expect(res.body).to.be.an('array');
    });

    it('❌ should return 500 on db error', async () => {
      const origRun = session.run;
      session.run = () => { throw new Error('db fail'); };

      const res = await request(app)
        .post('/flight/searchFlights')
        .set('Authorization', `Bearer ${token}`)
        .send({ cityFrom: 'Krakow' });

      expect(res.status).to.equal(500);
      expect(res.body.message).to.include('db fail');

      session.run = origRun;
    });
  });

  describe('POST /flight/getFlightsByIds', () => {
    it('✅ should return flights by IDs', async () => {
      const res = await request(app)
        .post('/flight/getFlightsByIds')
        .set('Authorization', `Bearer ${token}`)
        .send({ flightIds: [exampleFlightId] })
        .expect(200);

      expect(res.body).to.be.an('array');
      if (res.body.length)
        expect(res.body[0]).to.have.property('id', exampleFlightId);
    });

    it('❌ should return 400 if no flightIds', async () => {
      const res = await request(app)
        .post('/flight/getFlightsByIds')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(500);

      expect(res.body).to.have.property('message');
    });

    it('❌ should return 500 on Neo4j error', async () => {
      const origRun = session.run;
      session.run = () => { throw new Error('Neo4j fail'); };

      const res = await request(app)
        .post('/flight/getFlightsByIds')
        .set('Authorization', `Bearer ${token}`)
        .send({ flightIds: [exampleFlightId] });

      expect(res.status).to.equal(500);
      expect(res.body.message).to.include('Neo4j fail');

      session.run = origRun;
    });
  });

  describe('GET /flight/getFlightsByUserId/:userId', () => {
    it('✅ should return flights for user reservations', async () => {
      const res = await request(app)
        .get(`/flight/getFlightsByUserId/${exampleUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      if (res.body.length)
        expect(res.body[0]).to.include.keys('reservationId', 'id', 'originCountry', 'originCity');
    });

    it('✅ should return empty array if no reservations', async () => {
      const res = await request(app)
        .get('/flight/getFlightsByUserId/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).to.be.an('array').that.is.empty;
    });

    it('❌ should return 401 if no token', async () => {
      const res = await request(app)
        .get(`/flight/getFlightsByUserId/${exampleUserId}`)
        .expect(401);

      expect(res.body).to.have.property('message');
    });
  });

  describe('PATCH /flight/patchFlightById/:flightId', () => {
    it('✅ should patch flight fields', async () => {
      const res = await request(app)
        .patch(`/flight/patchFlightById/${exampleFlightId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 999, airlines: 'TestLine' })
        .expect(200);

      expect(res.body.message).to.include('updated');
    });

    it('❌ should return 500 on Neo4j error', async () => {
      const origRun = session.run;
      session.run = () => { throw new Error('fail'); };

      const res = await request(app)
        .patch(`/flight/patchFlightById/${exampleFlightId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 500 });

      expect(res.status).to.equal(500);
      expect(res.body.message).to.include('fail');

      session.run = origRun;
    });

    it('❌ should return 401 if no token', async () => {
      const res = await request(app)
        .patch(`/flight/patchFlightById/${exampleFlightId}`)
        .send({ price: 999 })
        .expect(401);

      expect(res.body).to.have.property('message');
    });
  });
});
