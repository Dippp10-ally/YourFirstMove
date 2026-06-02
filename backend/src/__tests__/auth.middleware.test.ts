import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';

// Mock AuthService so we don't need a real database
jest.mock('../services/AuthService', () => {
  return {
    __esModule: true,
    default: {
      validateToken: jest.fn(),
    },
  };
});

import authService from '../services/AuthService';

const mockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers: headers as any,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when no Authorization header is provided', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await authenticate(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header does not start with Bearer', async () => {
    const req = mockRequest({ authorization: 'Basic sometoken' });
    const res = mockResponse();

    await authenticate(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', async () => {
    (authService.validateToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

    const req = mockRequest({ authorization: 'Bearer invalidtoken' });
    const res = mockResponse();

    await authenticate(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() when token is valid', async () => {
    const fakeUser = { id: 1, email: 'test@example.com' };
    (authService.validateToken as jest.Mock).mockResolvedValue(fakeUser);

    const req = mockRequest({ authorization: 'Bearer validtoken' });
    const res = mockResponse();

    await authenticate(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});