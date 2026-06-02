import request from 'supertest';
import app from '../app';
import Task from '../models/Task';
import authService from '../services/AuthService';

// Mock the database connection
jest.mock('../config/database', () => ({
  default: {
    raw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  },
}));

// Mock AuthService
jest.mock('../services/AuthService', () => {
  return {
    __esModule: true,
    default: {
      validateToken: jest.fn(),
    },
  };
});

// Mock objection transaction
jest.mock('objection', () => {
  const actual = jest.requireActual('objection');
  return {
    ...actual,
    transaction: jest.fn().mockImplementation(async (knex, callback) => {
      return callback({});
    }),
  };
});

// Mock Task model
jest.mock('../models/Task');

describe('Task Security and Integrity API Tests', () => {
  const mockUser = { id: 1, email: 'user1@example.com' };
  const mockOtherUser = { id: 2, email: 'user2@example.com' };

  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (authService.validateToken as jest.Mock).mockResolvedValue(mockUser);
    
    // Mock Task.knex
    (Task.knex as jest.Mock).mockReturnValue({});

    mockQuery = {
      findById: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      patch: jest.fn().mockReturnThis(),
      deleteById: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      patchAndFetch: jest.fn().mockReturnThis(),
      page: jest.fn().mockReturnThis(),
      resultSize: jest.fn().mockResolvedValue(0),
      then: jest.fn().mockImplementation(function(resolve) {
        return Promise.resolve([]).then(resolve);
      }),
    };
    (Task.query as jest.Mock).mockReturnValue(mockQuery);
  });

  describe('Task Ownership Validation', () => {
    it('GET /api/tasks/:id should return 404 if task does not exist', async () => {
      mockQuery.then.mockImplementation(function(resolve: any) {
        return Promise.resolve(null).then(resolve);
      });

      const res = await request(app)
        .get('/api/tasks/123')
        .set('Authorization', 'Bearer validtoken');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('GET /api/tasks/:id should return 403 if task belongs to another user', async () => {
      mockQuery.then.mockImplementation(function(resolve: any) {
        return Promise.resolve({
          id: 123,
          user_id: mockOtherUser.id,
          title: 'Other user task',
        }).then(resolve);
      });

      const res = await request(app)
        .get('/api/tasks/123')
        .set('Authorization', 'Bearer validtoken');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });

    it('PUT /api/tasks/:id should return 403 if modifying task of another user', async () => {
      mockQuery.then.mockImplementation(function(resolve: any) {
        return Promise.resolve({
          id: 123,
          user_id: mockOtherUser.id,
          title: 'Other user task',
        }).then(resolve);
      });

      const res = await request(app)
        .put('/api/tasks/123')
        .set('Authorization', 'Bearer validtoken')
        .send({ title: 'New Title' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });
  });

  describe('Strict Payload Joi Validation', () => {
    it('POST /api/tasks should return 400 if unknown fields are provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer validtoken')
        .send({
          title: 'Valid Task',
          unknownField: 'malicious-data',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/tasks should return 400 if invalid date format is provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer validtoken')
        .send({
          title: 'Invalid Date Task',
          dueDate: '2026/06/02', // Should be YYYY-MM-DD
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details[0].field).toBe('dueDate');
    });

    it('POST /api/tasks should return 400 if invalid date value is provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer validtoken')
        .send({
          title: 'Invalid Date Task',
          dueDate: '2026-02-30', // February 30th does not exist
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/tasks should return 400 if invalid time format is provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer validtoken')
        .send({
          title: 'Invalid Time Task',
          dueTime: '25:00', // Invalid hour
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Reorder Validation and Rejection', () => {
    it('PATCH /api/tasks/reorder should return 400 if duplicate task IDs are provided', async () => {
      const res = await request(app)
        .patch('/api/tasks/reorder')
        .set('Authorization', 'Bearer validtoken')
        .send({
          taskIds: [1, 2, 2, 3], // Duplicate 2
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH /api/tasks/reorder should return 404 if any reordered task is missing', async () => {
      mockQuery.then.mockImplementation(function(resolve: any) {
        return Promise.resolve([
          { id: 1, user_id: mockUser.id },
        ]).then(resolve);
      });

      const res = await request(app)
        .patch('/api/tasks/reorder')
        .set('Authorization', 'Bearer validtoken')
        .send({
          taskIds: [1, 2],
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('PATCH /api/tasks/reorder should return 403 if any task belongs to another user', async () => {
      mockQuery.then.mockImplementation(function(resolve: any) {
        return Promise.resolve([
          { id: 1, user_id: mockUser.id },
          { id: 2, user_id: mockOtherUser.id },
        ]).then(resolve);
      });

      const res = await request(app)
        .patch('/api/tasks/reorder')
        .set('Authorization', 'Bearer validtoken')
        .send({
          taskIds: [1, 2],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });
  });

  describe('Duplicate Day Validation and Rejection', () => {
    it('POST /api/tasks/duplicate-day should return 400 if identical source and target dates are provided', async () => {
      const res = await request(app)
        .post('/api/tasks/duplicate-day')
        .set('Authorization', 'Bearer validtoken')
        .send({
          sourceDate: '2026-06-02',
          targetDate: '2026-06-02', // Identical
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
