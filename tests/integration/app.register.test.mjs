import request from 'supertest';
import { expect } from 'chai';
const { pool } = await import('../../src/config/db.js');
import app from '../../src/app.js';

describe('POST /register', () => {
  const validUser = {
    firstName: 'Anna',
    lastName: 'Kowalska',
    email: 'anna.kowalska@example.com',
    password: 'StrongPass123!',
    role: 'admin',
  };

  after(async () => {
    await pool.execute('DELETE FROM users WHERE email = ?', [validUser.email]);
  });

  it('✅ should register a new user and return 201', async () => {
    const res = await request(app).post('/register').send(validUser);
    expect(res.status).to.equal(201);
    expect(res.body.message).to.include(validUser.email);
  });

  it('❌ should return 409 if user with email already exists', async () => {
    const res = await request(app).post('/register').send(validUser);
    expect(res.status).to.equal(409);
    expect(res.body.message).to.equal('User with this email already exists.');
  });

  it('❌ should return 400 if firstName is missing', async () => {
    const { firstName, ...partialUser } = validUser;
    const res = await request(app).post('/register').send(partialUser);
    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('"firstName" is required');
  });

  it('❌ should return 400 if email is invalid', async () => {
    const res = await request(app).post('/register').send({
      ...validUser,
      email: 'not-an-email',
    });
    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('must be a valid email');
  });

  it('❌ should return 400 if password is too short', async () => {
    const res = await request(app).post('/register').send({
      ...validUser,
      email: 'shortpw@example.com',
      password: '123',
    });
    expect(res.status).to.equal(400);
    expect(res.body.message.toLowerCase()).to.include('password');
  });

  it('❌ should return 400 if role is invalid', async () => {
    const res = await request(app).post('/register').send({
      ...validUser,
      email: 'badrole@example.com',
      role: 'hacker',
    });
    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('role');
  });

  it('❌ should return 400 if missing all fields', async () => {
    const res = await request(app).post('/register').send({});
    expect(res.status).to.equal(400);
    expect(res.body.message).to.be.a('string');
  });

  it('❌ should return 500 on server error', async () => {
    const origExecute = pool.execute;
    pool.execute = () => { throw new Error('Mocked DB error'); };

    const res = await request(app).post('/register').send({
      ...validUser,
      email: 'error@example.com',
    });
    expect(res.status).to.equal(500);
    expect(res.body).to.have.property('error');

    pool.execute = origExecute;
  });
});
