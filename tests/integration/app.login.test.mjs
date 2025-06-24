import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import './setup.mjs';
const { pool } = await import('../../src/config/db.js');

describe('POST /login', () => {
  const testUser = {
    email: 'xavier@gmail.com',
    password: 'Admin123',
    firstName: 'Xavier',
    lastName: 'Venkatanarasimha',
    role: 'admin',
  };

  it('✅ should login successfully with correct credentials', async () => {
    const res = await request(app).post('/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken').that.is.a('string');
    expect(res.body).to.have.property('userId');
    expect(res.body).to.have.property('role');
    expect(res.body.message).to.include('Login successful');
    expect(res.headers['set-cookie']).to.exist;
  });

  it('❌ should return 400 if email is missing', async () => {
    const res = await request(app).post('/login').send({ password: testUser.password });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('required');
  });

  it('❌ should return 400 if password is missing', async () => {
    const res = await request(app).post('/login').send({ email: testUser.email });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('required');
  });

  it('❌ should return 400 if both fields are missing', async () => {
    const res = await request(app).post('/login').send({});

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('required');
  });

  it('❌ should return 401 if email is incorrect', async () => {
    const res = await request(app).post('/login').send({
      email: 'wrong@example.com',
      password: testUser.password,
    });

    expect(res.status).to.equal(401);
    expect(res.body.message).to.include('Invalid email or password');
  });

  it('❌ should return 401 if password is incorrect', async () => {
    const res = await request(app).post('/login').send({
      email: testUser.email,
      password: 'WrongPassword!',
    });

    expect(res.status).to.equal(401);
    expect(res.body.message).to.include('Invalid email or password');
  });

  it('❌ should return 500 on server error', async () => {
    const origExecute = pool.execute;
    pool.execute = () => { throw new Error('DB fail'); };

    const res = await request(app).post('/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).to.equal(500);
    expect(res.body).to.have.property('message');

    pool.execute = origExecute;
  });
});
