import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import pkg from '../../src/utils/generateToken.js';
import { pool } from '../../src/config/db.js'; // Dodane!
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

let createdUserId;
let createdFlightId = 'b10e200c-98d5-44be-acc0-96382d870111';
let createdReservationId;
let createdNotificationId;

// Helpers: wyczyść użytkownika testowego i powiązane rekordy po testach, jeśli trzeba.
after(async () => {
  if (createdUserId) {
    await pool.execute('DELETE FROM reservations WHERE user_id = ?', [createdUserId]);
    await pool.execute('DELETE FROM notifications WHERE user_id = ?', [createdUserId]);
    await pool.execute('DELETE FROM users WHERE id = ?', [createdUserId]);
  }
});

describe('User endpoints', () => {
  describe('GET /user/getAllUsers', () => {
    it('✅ should return a list of users for admin', async () => {
      const res = await request(app)
        .get('/user/getAllUsers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      if (res.body.length > 0) {
        expect(res.body[0]).to.include.keys(
          'id', 'firstName', 'lastName', 'email', 'image',
          'phone', 'address', 'description', 'role'
        );
      }
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .get('/user/getAllUsers')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body).to.have.property('message');
    });

    it('❌ should return 401 if no token', async () => {
      const res = await request(app)
        .get('/user/getAllUsers')
        .expect(401);

      expect(res.body).to.have.property('message');
    });

    it('❌ should return 500 on DB error', async () => {
      // Użyj poprawnej ścieżki do pool!
      const origQuery = pool.query;
      pool.query = () => { throw new Error('DB fail'); };

      const res = await request(app)
        .get('/user/getAllUsers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).to.equal(500);
      expect(res.body.error || res.body.message).to.include('DB fail');

      pool.query = origQuery;
    });
  });

  describe('POST /user/createNewUser', () => {
    it('✅ should create a new user', async () => {
      const res = await request(app)
        .post('/user/createNewUser')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Ala',
          lastName: 'Nowak',
          email: 'ala.nowak@example.com',
          password: 'StrongPass1!',
          image: 'img.png',
          phone: '111222333',
          address: 'Testowa 1',
          description: 'test user',
          role: 'user'
        })
        .expect(201);
      expect(res.body).to.have.property('message', 'User created');
      expect(res.body).to.have.property('id');
      createdUserId = res.body.id;
    });

    it('❌ should return 409 if user with email exists', async () => {
      const res = await request(app)
        .post('/user/createNewUser')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Ala',
          lastName: 'Nowak',
          email: 'ala.nowak@example.com',
          password: 'StrongPass1!',
          image: 'img.png',
          phone: '111222333',
          address: 'Testowa 1',
          description: 'test user',
          role: 'user'
        })
        .expect(409);
      expect(res.body.message).to.include('already exists');
    });

    it('❌ should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/user/createNewUser')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'x@x.x' })
        .expect(400);
      expect(res.body.message).to.include('required');
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .post('/user/createNewUser')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'jan.kowalski@example.com',
          password: 'Pass123!',
          image: 'img.png',
          phone: '444555666',
          address: 'Testowa 2',
          description: 'test user',
          role: 'user'
        })
        .expect(403);

      expect(res.body).to.have.property('message');
    });
  });

  describe('GET /user/getUserById/:userId', () => {
    it('✅ should return user object for existing user (admin)', async () => {
      const res = await request(app)
        .get(`/user/getUserById/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.include.keys(
        'id', 'firstName', 'lastName', 'email', 'image',
        'phone', 'address', 'description', 'role'
      );
      expect(res.body.id).to.equal(createdUserId);
    });

    it('❌ should return 404 for non-existing user', async () => {
      const res = await request(app)
        .get('/user/getUserById/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.message).to.include('not found');
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .get(`/user/getUserById/${createdUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body).to.have.property('message');
    });

    it('❌ should return 401 if no token', async () => {
      const res = await request(app)
        .get(`/user/getUserById/${createdUserId}`)
        .expect(401);

      expect(res.body).to.have.property('message');
    });
  });

  describe('PUT /user/updateUserById/:userId', () => {
    it('✅ should update user by ID', async () => {
      const res = await request(app)
        .put(`/user/updateUserById/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Alina',
          lastName: 'Nowak',
          email: 'ala.nowak@example.com',
          password: 'NewPass123!',
          image: 'img2.png',
          phone: '999888777',
          address: 'Testowa 2',
          description: 'user2',
          role: 'admin'
        })
        .expect(200);
      expect(res.body.message).to.include('updated');
    });

    it('❌ should return 400 if missing fields', async () => {
      const res = await request(app)
        .put(`/user/updateUserById/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@x.x' })
        .expect(400);
      expect(res.body.message).to.include('required');
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .put(`/user/updateUserById/${createdUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Tomasz',
          lastName: 'Tester',
          email: 'tomasz@test.pl',
          password: 'Test123!',
          image: 'img.png',
          phone: '555666777',
          address: 'Nowa 1',
          description: 'desc',
          role: 'user'
        })
        .expect(403);

      expect(res.body).to.have.property('message');
    });
  });

  describe('PATCH /user/patchUserById/:userId', () => {
    it('✅ should patch user fields', async () => {
      const res = await request(app)
        .patch(`/user/patchUserById/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '000111222', address: 'Zmiana 5' })
        .expect(200);
      expect(res.body.message).to.include('patched');
    });

    it('❌ should return 400 for empty body', async () => {
      const res = await request(app)
        .patch(`/user/patchUserById/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
      expect(res.body.message).to.include('No valid fields');
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .patch(`/user/patchUserById/${createdUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ address: 'Zmiana 5' })
        .expect(403);

      expect(res.body).to.have.property('message');
    });
  });

  describe('POST /user/createNotification', () => {
    it('✅ should create a notification', async () => {
      const res = await request(app)
        .post('/user/createNotification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: createdUserId,
          message: 'Test notification message'
        })
        .expect(201);

      expect(res.body).to.have.property('message', 'Notification created');
      expect(res.body).to.have.property('notificationId');
      createdNotificationId = res.body.notificationId;
    });

    it('❌ should return 400 if fields are missing', async () => {
      const res = await request(app)
        .post('/user/createNotification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'Only message' })
        .expect(400);

      expect(res.body.message).to.include('required');
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .post('/user/createNotification')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: createdUserId,
          message: 'Test notification message'
        })
        .expect(403);

      expect(res.body).to.have.property('message');
    });
  });

  describe('POST /user/createReservation', () => {
    it('✅ should create a reservation', async () => {
      const res = await request(app)
        .post('/user/createReservation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: createdUserId,
          flightId: createdFlightId
        })
        .expect(201);

      expect(res.body).to.have.property('message', 'Reservation created');
      expect(res.body).to.have.property('reservationId');
      createdReservationId = res.body.reservationId;
    });

    it('❌ should return 400 if fields are missing', async () => {
      const res = await request(app)
        .post('/user/createReservation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: createdUserId })
        .expect(400);

      expect(res.body.message).to.include('required');
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .post('/user/createReservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: createdUserId,
          flightId: createdFlightId
        })
        .expect(403);

      expect(res.body).to.have.property('message');
    });
  });

  describe('DELETE /user/deleteReservationById/:reservationId', () => {
    it('✅ should delete a reservation', async () => {
      let reservationId = createdReservationId;
      if (!reservationId) {
        const res = await request(app)
          .post('/user/createReservation')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: createdUserId,
            flightId: createdFlightId
          });
        reservationId = res.body.reservationId;
      }

      const res = await request(app)
        .delete(`/user/deleteReservationById/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).to.include('deleted');
    });

    it('❌ should return 404 if reservation does not exist', async () => {
      const res = await request(app)
        .delete('/user/deleteReservationById/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.message).to.include('not found');
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .delete(`/user/deleteReservationById/${createdReservationId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body).to.have.property('message');
    });
  });

  describe('GET /user/getNotificationsByUserId/:userId', () => {
    it('✅ should return a list of notifications (can be empty)', async () => {
      const res = await request(app)
        .get(`/user/getNotificationsByUserId/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      if (res.body.length > 0) {
        expect(res.body[0]).to.include.keys('message', 'created_at');
      }
    });

    it('✅ should return empty array if user has no notifications', async () => {
      const res = await request(app)
        .get('/user/getNotificationsByUserId/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array').that.is.empty;
    });

    it('❌ should return 403 for non-admin', async () => {
      const res = await request(app)
        .get(`/user/getNotificationsByUserId/${createdUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body).to.have.property('message');
    });
  });
});
