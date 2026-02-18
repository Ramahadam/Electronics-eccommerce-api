const Cart = require('../models/cartModels');
const Product = require('../models/productModels');
const Stock = require('../models/stockModels');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/cart
 *
 * STOCK INTEGRATION:
 * - Populate stock info for each cart item
 * - Show available quantity
 * - Show low stock warnings
 */
exports.getCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.userId }).populate(
    'items.product',
  );

  if (!cart) {
    return res.status(200).json({
      status: 'success',
      data: {
        items: [],
        totalPrice: 0,
      },
    });
  }

  // Get stock info for all products in cart
  const productIds = cart.items.map((item) => item.product._id);
  const stocks = await Stock.find({
    product: { $in: productIds },
  }).select('product quantity reserved');

  // Create stock map for quick lookup
  const stockMap = {};
  stocks.forEach((stock) => {
    stockMap[stock.product.toString()] = {
      available: stock.quantity - stock.reserved,
      quantity: stock.quantity,
      reserved: stock.reserved,
      isLowStock: stock.isLowStock,
      status: stock.status,
    };
  });

  // Enrich cart items with stock info
  const enrichedItems = cart.items.map((item) => {
    const stockInfo = stockMap[item.product._id.toString()] || {
      available: 0,
      quantity: 0,
      reserved: 0,
      isLowStock: true,
      status: 'out_of_stock',
    };

    return {
      ...item.toObject(),
      stock: stockInfo,
      // Warning if cart quantity exceeds available
      exceedsStock: item.quantity > stockInfo.available,
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      items: enrichedItems,
      totalPrice: cart.totalPrice,
    },
  });
});

// POST /api/cart
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  let cart = await Cart.findOne({ user: req.userId });

  const product = await Product.findById(productId).select('unitPrice');
  if (!product) throw new AppError('Product not found', 404);

  if (!cart) {
    cart = await Cart.create({
      user: req.userId,
      items: [
        {
          product: productId,
          quantity,
          unitPrice: Number(product.unitPrice),
        },
      ],
    });
  } else {
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        unitPrice: Number(product.unitPrice),
      });
    }
  }

  cart.totalPrice = await cart.calculateTotalPrice(cart.items);
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// PATCH /api/cart/:itemId
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) throw new AppError('Cart not found', 404);

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === itemId,
  );

  if (itemIndex < 0) throw new AppError('Item not found in cart', 404);

  if (quantity <= 0) {
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== itemId,
    );
  } else {
    cart.items[itemIndex].quantity = quantity;
  }

  cart.totalPrice = await cart.calculateTotalPrice(cart.items);
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// DELETE /api/cart/:itemId
exports.removeCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) throw new AppError('Cart not found', 404);

  cart.items = cart.items.filter((item) => item.product.toString() !== itemId);

  cart.totalPrice = await cart.calculateTotalPrice(cart.items);
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// DELETE /api/cart
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.userId },
    {
      $set: {
        items: [],
        totalPrice: 0,
      },
    },
    { new: true },
  );

  if (!cart) throw new AppError('Cart not found', 404);

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});
