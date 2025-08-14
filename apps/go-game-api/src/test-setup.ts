// Test setup for API testing
import { beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/go-game-test';
process.env.PORT = '3000';

// Mock MongoDB connection for tests
const mockDb = {
  collection: vi.fn().mockReturnValue({
    findOne: vi.fn(),
    find: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'mock-id' }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    createIndex: vi.fn().mockResolvedValue('mock-index'),
  }),
  close: vi.fn(),
};

// Mock mongoose for database operations
const MockSchema = function(definition: any) {
  return {
    ...definition,
    pre: vi.fn(),
    post: vi.fn(),
    methods: {},
    statics: {},
    index: vi.fn(),
  };
};

MockSchema.Types = {
  ObjectId: 'ObjectId',
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  Mixed: 'Mixed',
};

vi.mock('mongoose', () => ({
  connect: vi.fn().mockResolvedValue(mockDb),
  connection: {
    db: mockDb,
    close: vi.fn().mockResolvedValue(undefined),
  },
  Schema: MockSchema,
  model: vi.fn().mockImplementation((name) => {
    const MockModel = class {
      constructor(data: any) {
        Object.assign(this, data);
      }
      save = vi.fn().mockResolvedValue(this);
      static find = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });
      static findById = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      static findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      static create = vi.fn().mockResolvedValue({});
      static findByIdAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      static findByIdAndDelete = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
    };
    return MockModel;
  }),
  Types: {
    ObjectId: vi.fn().mockImplementation((id) => id || 'mock-object-id'),
  },
}));

// Mock bcrypt for password hashing
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true),
  genSalt: vi.fn().mockResolvedValue('mock-salt'),
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('mock-jwt-token'),
  verify: vi.fn().mockReturnValue({ userId: 'mock-user-id' }),
  decode: vi.fn().mockReturnValue({ userId: 'mock-user-id' }),
}));

// Setup and teardown hooks
beforeAll(async () => {
  // Global test setup
});

afterAll(async () => {
  // Global test cleanup
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});