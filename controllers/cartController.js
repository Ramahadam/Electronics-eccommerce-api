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

/**
 * POST /api/cart
 *
 * STOCK INTEGRATION:
 * - Validate stock availability before adding
 * - Show clear error if insufficient stock
 * - Suggest available quantity
 */

exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  // Validate quantity
  if (quantity < 1) {
    return next(new AppError('Quantity must be at least 1', 400));
  }

  // Get product
  const product = await Product.findById(productId).select('unitPrice title');
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // ✅ STOCK VALIDATION: Check available stock
  const stock = await Stock.findOne({ product: productId });

  if (!stock) {
    return next(
      new AppError('Stock information not available for this product', 404),
    );
  }

  const availableStock = stock.quantity - stock.reserved;

  // Get existing cart
  let cart = await Cart.findOne({ user: req.userId });

  // Calculate total quantity user is trying to add
  let totalQuantityInCart = quantity;

  if (cart) {
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );
    if (existingItem) {
      totalQuantityInCart += existingItem.quantity;
    }
  }

  // Check if total quantity exceeds available stock
  if (totalQuantityInCart > availableStock) {
    return next(
      new AppError(
        `Cannot add ${quantity} item(s). Only ${availableStock} available (you already have ${totalQuantityInCart - quantity} in cart)`,
        400,
      ),
    );
  }

  // Create or update cart
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

  // Populate product for response
  await cart.populate('items.product');

  res.status(200).json({
    status: 'success',
    message: `${quantity} × ${product.title} added to cart`,
    data: {
      cart,
    },
  });
});

/**
 * PATCH /api/cart/:itemId
 *
 * STOCK INTEGRATION:
 * - Validate new quantity against available stock
 * - Allow decrease without stock check
 * - Show available stock in error message
 */
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  // Validate quantity
  if (quantity < 0) {
    return next(new AppError('Quantity cannot be negative', 400));
  }

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === itemId,
  );

  if (itemIndex < 0) {
    return next(new AppError('Item not found in cart', 404));
  }

  const currentQuantity = cart.items[itemIndex].quantity;

  // If removing item or quantity is 0
  if (quantity <= 0) {
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== itemId,
    );
  } else if (quantity > currentQuantity) {
    // ✅ STOCK VALIDATION: Only check when increasing quantity
    const stock = await Stock.findOne({ product: itemId });

    if (!stock) {
      return next(
        new AppError('Stock information not available for this product', 404),
      );
    }

    const availableStock = stock.quantity - stock.reserved;

    if (quantity > availableStock) {
      return next(
        new AppError(
          `Cannot update to ${quantity} item(s). Only ${availableStock} available in stock`,
          400,
        ),
      );
    }

    cart.items[itemIndex].quantity = quantity;
  } else {
    // Decreasing quantity - no stock check needed
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
