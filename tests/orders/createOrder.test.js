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

    it('should handle multiple items in cart', async () => {
      // Create additional products
      const product2 = await Product.create({
        title: 'Desktop all in one',
        unitPrice: 299,
        brand: 'hp',
        category: 'desktop',
        description: 'All in one desktop',
        stock: 50,
      });

      const product3 = await Product.create({
        title: 'CCTV camera HD',
        unitPrice: 1499,
        brand: 'max',
        category: 'cctv',
        description: 'CCTV camera HD',
        stock: 25,
      });

      // Update cart with multiple items
      const totalPrice = 999 * 2 + 299 * 1 + 1499 * 3; // 6794
      await Cart.findOneAndUpdate(
        { user: user._id },
        {
          items: [
            {
              product: product._id,
              quantity: 2,
              unitPrice: 999,
            },
            {
              product: product2._id,
              quantity: 1,
              unitPrice: 299,
            },
            {
              product: product3._id,
              quantity: 3,
              unitPrice: 1499,
            },
          ],
          totalPrice: totalPrice,
        },
      );

      const response = await request(app)
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');

      const order = response.body.data.order;

      // Verify order has all 3 items
      expect(order.items).toHaveLength(3);
      expect(order.totalAmount).toBe(totalPrice);

      // Verify each item in the order
      const desktop = order.items.find(
        (item) => item.name === 'Desktop all in one',
      );

      expect(desktop).toBeDefined();
      expect(desktop.quantity).toBe(1);
      expect(desktop.price).toBe(299);

      const cctv = order.items.find((item) => item.name === 'CCTV camera HD');

      expect(cctv).toBeDefined();
      expect(cctv.quantity).toBe(3);
      expect(cctv.price).toBe(1499);

      const laptop = order.items.find((item) => item.name === 'Test Product');

      expect(laptop).toBeDefined();
      expect(laptop.quantity).toBe(2);
      expect(laptop.price).toBe(999);

      // Verify cart is cleared
      const updatedCart = await Cart.findOne({ user: user._id });
      expect(updatedCart.items).toHaveLength(0);
      expect(updatedCart.totalPrice).toBe(0);

      // Verify order is saved in database
      const dbOrder = await Order.findOne({ user: user._id });
      expect(dbOrder.items).toHaveLength(3);
      expect(dbOrder.totalAmount).toBe(totalPrice);
    });

    it('should apply correct pricing from cart, not current product price', async () => {
      // Scenario: User adds product to cart at price 999
      // Product price changes to 1299
      // Order should use the cart's saved price (999), not the new price (1299)

      // Initial setup: Cart has product at 999 (already done in beforeEach)
      const cartBeforeOrder = await Cart.findOne({ user: user._id });
      expect(cartBeforeOrder.items[0].unitPrice).toBe(999);
      expect(cartBeforeOrder.totalPrice).toBe(999);

      // Simulate price change: Update product price to 1299
      await Product.findByIdAndUpdate(product._id, { unitPrice: 1299 });

      // Verify product price changed in database
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.unitPrice).toBe(1299);

      // Create order - should use cart's saved price (999), not new price (1299)
      const response = await request(app)
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');

      const order = response.body.data.order;

      // CRITICAL: Verify order uses cart's saved price (999), not current product price (1299)
      expect(order.items[0].price).toBe(999); // Cart's saved price
      expect(order.items[0].price).not.toBe(1299); // NOT the current product price
      expect(order.totalAmount).toBe(999);

      // Verify in database
      const dbOrder = await Order.findOne({ user: user._id });
      expect(dbOrder.items[0].price).toBe(999);
      expect(dbOrder.totalAmount).toBe(999);

      // Double-check: Product price is still 1299 in database
      const productAfterOrder = await Product.findById(product._id);
      expect(productAfterOrder.unitPrice).toBe(1299);
    });

    it('should apply correct pricing with multiple items and varying prices', async () => {
      // Create products
      const product2 = await Product.create({
        title: 'Laptop macbook',
        unitPrice: 199,
        brand: 'macbook',
        category: 'laptop',
        description: 'Macbook M4',
        stock: 100,
      });

      // Add to cart with specific prices
      const cartPrice1 = 899; // Discounted from 999
      const cartPrice2 = 149; // Discounted from 199
      const totalPrice = cartPrice1 * 3 + cartPrice2 * 5; // 3442

      await Cart.findOneAndUpdate(
        { user: user._id },
        {
          items: [
            {
              product: product._id,
              quantity: 3,
              unitPrice: cartPrice1, // Saved at discounted price
            },
            {
              product: product2._id,
              quantity: 5,
              unitPrice: cartPrice2, // Saved at discounted price
            },
          ],
          totalPrice: totalPrice,
        },
      );

      // Change product prices to higher values
      await Product.findByIdAndUpdate(product._id, { unitPrice: 1099 });
      await Product.findByIdAndUpdate(product2._id, { unitPrice: 249 });

      // Create order
      const response = await request(app)
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(201);

      const order = response.body.data.order;

      // Verify cart's saved prices are used, not current product prices
      const item1 = order.items.find((item) => item.name === 'Test Product');
      expect(item1.price).toBe(cartPrice1); // 899, not 1099
      expect(item1.quantity).toBe(3);

      const item2 = order.items.find((item) => item.name === 'Laptop macbook');
      expect(item2.price).toBe(cartPrice2); // 149, not 249
      expect(item2.quantity).toBe(5);

      // Verify total uses cart prices
      expect(order.totalAmount).toBe(totalPrice); // 3442

      // Calculate what it would be with current prices
      const currentPriceTotal = 1099 * 3 + 249 * 5; // 4542
      expect(order.totalAmount).not.toBe(currentPriceTotal);
      expect(order.totalAmount).toBeLessThan(currentPriceTotal);
    });
  });
});
