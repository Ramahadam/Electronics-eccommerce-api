// tests/setup.js
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let mongod;

beforeAll(async () => {
  jest.setTimeout(120000);
  process.env.NODE_ENV = 'development';

  console.log('🔧 Creating replica set...');
  mongod = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });

  const uri = mongod.getUri();
  console.log('🔧 URI:', uri);

  await mongoose.connect(uri);

  console.log('✅ Connected to MongoDB replica set');
}, 120000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});
