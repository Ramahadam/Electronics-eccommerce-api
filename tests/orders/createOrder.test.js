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
    jest.clearAllMocks();

    user = await User.create({
      email: 'test@test.com',
      fullname: 'Test User',
      firebaseUid: 'test-firebase-uid',
    });

    product = await Product.create({
      title: 'Test Product',
      unitPrice: 999,
      brand: 'Test Brand',
      category: 'laptop',
      description: 'Test product description',
      stock: 10,
    });

    await Cart.create({
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

    const authMiddleware = require('../../middleware/auth.middleware');
    authMiddleware.appendUserId.mockImplementation((req, res, next) => {
      req.userId = user._id;
      req.user = user;
      next();
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/v1/order', () => {
    it('should successfully create an order and clear the cart', async () => {
      const response = await request(app)
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.totalAmount).toBe(999);

      // Verify cart is cleared
      const updatedCart = await Cart.findOne({ user: user._id });
      expect(updatedCart.items).toHaveLength(0);
      expect(updatedCart.totalPrice).toBe(0);

      // Verify order was created
      const createdOrder = await Order.findOne({ user: user._id });
      expect(createdOrder).toBeDefined();
      expect(createdOrder.totalAmount).toBe(999);
      expect(createdOrder.items).toHaveLength(1);
    });

    it('should fail with 404 when cart is empty', async () => {
      await Cart.findOneAndUpdate(
        { user: user._id },
        { items: [], totalPrice: 0 },
      );

      const response = await request(app)
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/empty/i);

      // Verify no order was created
      const orders = await Order.find({ user: user._id });
      expect(orders).toHaveLength(0);
    });
  });
});
