const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const { confirmEmailLink } = require('./ConfirmationLinkController');

jest.mock('jsonwebtoken');
jest.mock('../models/UserModel');

const app = express();
app.use(express.json());
app.get('/confirm-email/:token', confirmEmailLink);

describe('Confirm Email Link Middleware', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should confirm the email and return a success message', async () => {
    const userId = '1234';
    const token = 'some-jwt-token';

    jwt.verify.mockImplementation(() => userId);
    User.findById.mockResolvedValue({
      _id: userId,
      isConfirmed: false,
      save: jest.fn().mockResolvedValue({}),
    });

    const res = await request(app).get(`/confirm-email/${token}`);

    expect(jwt.verify).toHaveBeenCalledWith(
      token,
      process.env.JWT_SECRET,
      expect.any(Function),
    );
    expect(User.findById).toHaveBeenCalledWith(userId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Your Account has been Verified.' });
  });

  it('should return an error if there is no user', () => {});

  // Add more test cases as needed, e.g., for invalid tokens or users not found.
});
