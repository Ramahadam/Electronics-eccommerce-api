const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      unique: true, // One stock record per product
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    reserved: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative'],
      validate: {
        validator: function (value) {
          return value <= this.quantity;
        },
        message: 'Reserved quantity cannot exceed total quantity',
      },
    },
    minStock: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock cannot be negative'],
    },
    maxStock: {
      type: Number,
      default: 1000,
      min: [0, 'Maximum stock cannot be negative'],
      validate: {
        validator: function (value) {
          return value >= this.minStock;
        },
        message: 'Maximum stock must be greater than or equal to minimum stock',
      },
    },
    lastRestocked: {
      type: Date,
    },
    lastSold: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

stockSchema.index({ product: 1 }, { unique: true });
stockSchema.index({ quantity: 1 });

/**
 * Available stock = quantity - reserved
 */

stockSchema.virtual('available').get(function () {
  return this.quantity - this.reserved;
});

/**
 * Check if stock is low
 */

stockSchema.virtual('isLowStock').get(function () {
  return this.available < this.minStock;
});

/**
 * Check if product is out of stock
 */

stockSchema.virtual('isOutOfStock').get(function () {
  return this.available === 0;
});

/**
 * Stock status for display
 */

stockSchema.virtual('status').get(function () {
  let available = this.available;
  if (available === 0) return 'out_of_stock';
  if (available <= this.minStock) return 'low_stock';
  if (this.quantity >= this.maxStock) return 'overstocked';

  return 'in_stock';
});

// STATIC METHODS

/**
 * Get avaible stock for product
 * @param {ObjectId} productId - Product ID
 * @returns {number} Available stock (quantity - reserved)
 */

stockSchema.statics.getAvailableStock = async function (productId) {
  const stock = await this.findOne({ product: productId });
  return stock ? stock.available : 0;
};

/**
 * Get stock for multiple products (bulk query)
 * @param {Array<ObjectId>} productIds - Array of product IDs
 * @returns {Object} map of productId -> avaible stock
 */

stockSchema.statics.getStockForProducts = async function (productIds) {
  const stocks = await this.find({
    product: { $in: productIds },
  }).select('product quantity reserved');

  const stockMap = {};

  stocks.forEach((stock) => {
    stockMap[stock.product.toString()] = stock.available;
  });

  return stockMap;
};

/**
 * Get product with low stock
 * @param {Number} limit - Maximum results
 * @returns {Array} products belowminStock threshold
 */

stockSchema.statics.getLowStockProducts = async function (limit = 20) {
  return await this.find()
    .where('quantity')
    .lte(this.minStock)
    .populate('product', 'title images unitPrice')
    .limit(limit);
};

// INSTANCE METHODS

/**
 * Reserve stock for an order
 * This prevent race condition where two users try to buy the last item (overselling)
 * @param {Number} quantity - Quantity to reserve
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object|null} update state or null if insufficient
 */

stockSchema.methods.reserve = async function (quantity, session = null) {
  const Stock = mongoose.model('Stock');

  // CRITICAL: Atomic operation with conditional update
  const updatedStock = await Stock.findOneAndUpdate(
    {
      _id: this._id,
      // Check: available stock >= requested quantity
      $expr: {
        $gte: [{ $subtract: ['$quantity', '$reserved'] }, quantity],
      },
    },
    {
      // If check passes, increment reserved
      $inc: { reserved: quantity },
      $set: { lastSold: new Date() },
    },
    {
      new: true,
      session,
    },
  );

  // If updatedStock is null, insufficient stock
  return updatedStock;
};

/**
 * Confirm reservation (convert reserved to sold)
 */

stockSchema.methods.confirm = async function name(quantity, session = null) {
  const Stock = mongoose.model('Stock');

  const updatedStock = await Stock.findOneAndUpdate(
    this._id,
    {
      $inc: {
        quantity: -quantity,
        reserved: -quantity,
      },
    },
    {
      new: true,
      session,
    },
  );

  return updatedStock;
};

/**
 * Release reservation
 * Called when order is cancelled
 * Decrease reserved, making stock avaible again
 */

stockSchema.methods.release = async function (quantity, session = null) {
  const Stock = mongoose.model('Stock');

  const updatedStock = await Stock.findOneAndUpdate(
    this._id,
    {
      $inc: {
        reserve: -quantity,
      },
    },
    {
      new: true,
      session,
    },
  );

  return updatedStock;
};

const Stock = mongoose.model('Stock', stockSchema);
