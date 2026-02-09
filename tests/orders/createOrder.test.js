const request = require('supertest');
const app = require('../../app');
const User = require('../../models/userModels');
const Product = require('../../models/productModels');
const Cart = require('../../models/cartModels');
const Order = require('../../models/orderModels');
const mongoose = require('mongoose');

jest.mock('../../middleware/auth.middleware', () => {
  const originalModule = jest.requireActual('../../middleware/auth.middleware');
  return {
    ...originalModule,
    protect: jest.fn((req, res, next) => {
      console.log('🔐 Mock: protect middleware called');
      req.firebaseUid = 'test-firebase-uid';
      next();
    }),
    appendUserId: jest.fn(),
    restrictTo: jest.fn(() => (req, res, next) => next()),
  };
});

jest.mock('../../lib/firebase/firebase.config', () => ({
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-firebase-uid',
      email: 'testuser@example.com',
    }),
  }),
}));

describe('Order API Tests', () => {
  let user;
  let product;
  const token = 'mock-token';

  beforeEach(async () => {
    console.log('\n🧪 Test: Starting beforeEach...');
    jest.clearAllMocks();

    console.log('👤 Creating user...');
    user = await User.create({
      email: 'test@test.com',
      fullname: 'Test User',
      firebaseUid: 'test-firebase-uid',
    });
    console.log('✅ User created:', user._id);

    console.log('📦 Creating product...');
    product = await Product.create({
      title: 'Test Product',
      unitPrice: 999,
      brand: 'Test Brand',
      category: 'laptop', // Make sure this matches your schema enum
      description: 'Test product description',
      stock: 10,
    });
    console.log('✅ Product created:', product._id);

    console.log('🛒 Creating cart...');
    const cart = await Cart.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          unitPrice: product.unitPrice,
        },
      ],
      totalPrice: 999,
    });
    console.log('✅ Cart created:', cart._id);

    console.log('🔧 Setting up auth mock...');
    const authMiddleware = require('../../middleware/auth.middleware');
    authMiddleware.appendUserId.mockImplementation((req, res, next) => {
      console.log('🔐 Mock: appendUserId middleware called');
      req.userId = user._id;
      req.user = user;
      next();
    });
    console.log('✅ beforeEach complete\n');
  });

  afterAll(async () => {
    console.log('🔧 Test: Closing connection...');
    await mongoose.connection.close();
    console.log('✅ Test: Connection closed');
  });

  describe('POST /api/v1/order', () => {
    it('should successfully create an order and clear the cart', async () => {
      console.log('🚀 Test 1: Starting test...');

      console.log('📤 Making POST request to /api/v1/order...');
      const response = await request(app)
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${token}`)
        .send();

      console.log('📥 Response received');
      console.log('Status:', response.status);
      console.log('Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.order).toBeDefined();

      const updatedCart = await Cart.findOne({ user: user._id });
      expect(updatedCart.items).toHaveLength(0);

      const createdOrder = await Order.findOne({ user: user._id });
      expect(createdOrder).toBeDefined();
      expect(createdOrder.totalAmount).toBe(999);

      console.log('✅ Test 1: Complete\n');
    });

    it('should fail with 404 when cart is empty', async () => {
      console.log('🚀 Test 2: Starting test...');

      await Cart.findOneAndUpdate(
        { user: user._id },
        { items: [], totalPrice: 0 },
      );

      console.log('📤 Making POST request with empty cart...');
      const response = await request(app)
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${token}`)
        .send();

      console.log('📥 Response received');
      console.log('Status:', response.status);
      console.log('Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/empty/i);

      console.log('✅ Test 2: Complete\n');
    });
  });
});
