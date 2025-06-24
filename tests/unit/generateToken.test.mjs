import dotenv from 'dotenv';
dotenv.config();

import { expect } from 'chai';
import { generateAccessToken } from '../../src/utils/generateToken.js';
import jwt from 'jsonwebtoken';

describe('generateAccessToken', () => {
  it('should return a JWT token as string', () => {
    const user = { userId: 123, email: 'test@x.com', role: 'admin' };
    const token = generateAccessToken(user);
    expect(token).to.be.a('string');
  });

    it('should contain correct payload', () => {
    const user = { userId: 123, email: 'test@x.com', role: 'admin' };
    const token = generateAccessToken(user);
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    expect(decoded.userInfo.userId).to.equal(123);
    expect(decoded.userInfo.email).to.equal('test@x.com');
    expect(decoded.userInfo.role).to.equal('admin');
    });
});
