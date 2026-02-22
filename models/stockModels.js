const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
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

// INDEXES
stockSchema.index({ product: 1 }, { unique: true });
stockSchema.index({ quantity: 1 }); // For low stock queries

// VIRTUAL FIELDS

/**
 * Available stock = quantity - reserved
 * This is what customers can actually buy
 */
stockSchema.virtual('available').get(function () {
  return this.quantity - this.reserved;
});

/**
 * Check if stock is low (below minimum threshold)
 */
stockSchema.virtual('isLowStock').get(function () {
  return this.available <= this.minStock;
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
  const available = this.available;
  if (available === 0) return 'out_of_stock';
  if (available <= this.minStock) return 'low_stock';
  if (this.quantity >= this.maxStock) return 'overstocked';
  return 'in_stock';
});

// STATIC METHODS

/**
 * Get available stock for a product
 * @param {ObjectId} productId - Product ID
 * @returns {Number} Available stock (quantity - reserved)
 */
stockSchema.statics.getAvailableStock = async function (productId) {
  const stock = await this.findOne({ product: productId });
  return stock ? stock.available : 0;
};

/**
 * Get stock for multiple products (bulk query)
 * @param {Array<ObjectId>} productIds - Array of product IDs
 * @returns {Object} Map of productId -> available stock
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
 * Get products with low stock
 * @param {Number} limit - Maximum results (default: 20)
 * @param {Number} threshold - Stock threshold (default: 10)
 * @returns {Promise<Array>} Products below threshold
 */
stockSchema.statics.getLowStockProducts = async function (
  limit = 20,
  threshold = 10,
) {
  return await this.find()
    .where('quantity')
    .lte(threshold)
    .populate('product', 'title images unitPrice')
    .sort('quantity') // Lowest stock first
    .limit(limit)
    .exec();
};

// INSTANCE METHODS

/**
 * Reserve stock for an order (ATOMIC OPERATION)
 *
 * This prevents race conditions where two users try to buy the last item
 *
 * @param {Number} quantity - Quantity to reserve
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object|null} Updated stock or null if insufficient
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
 *
 * Called when payment is confirmed
 * Reduces both quantity and reserved
 *
 * @param {Number} quantity - Quantity to confirm
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object} Updated stock
 */
stockSchema.methods.confirm = async function (quantity, session = null) {
  const Stock = mongoose.model('Stock');

  const updatedStock = await Stock.findByIdAndUpdate(
    this._id,
    {
      $inc: {
        quantity: -quantity, // Reduce actual stock
        reserved: -quantity, // Remove from reserved
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
 * Release reservation (return to available)
 *
 * Called when order is cancelled
 * Decreases reserved, making stock available again
 *
 * @param {Number} quantity - Quantity to release
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object} Updated stock
 */
stockSchema.methods.release = async function (quantity, session = null) {
  const Stock = mongoose.model('Stock');

  const updatedStock = await Stock.findByIdAndUpdate(
    this._id,
    {
      $inc: { reserved: -quantity }, // Release back to available
    },
    {
      new: true,
      session,
    },
  );

  return updatedStock;
};

/**
 * Adjust stock quantity (manual correction)
 *
 * Used by admins for:
 * - Adding new inventory
 * - Correcting errors
 * - Marking damaged items
 *
 * @param {Number} adjustment - Positive to add, negative to subtract
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object} Updated stock
 */
stockSchema.methods.adjust = async function (adjustment, session = null) {
  const Stock = mongoose.model('Stock');

  const updatedStock = await Stock.findByIdAndUpdate(
    this._id,
    {
      $inc: { quantity: adjustment },
      $set:
        adjustment > 0
          ? { lastRestocked: new Date() }
          : { lastSold: new Date() },
    },
    {
      new: true,
      session,
    },
  );

  return updatedStock;
};

/**
 * Check if stock can fulfill an order
 * @param {Number} quantity - Requested quantity
 * @returns {Boolean}
 */
stockSchema.methods.canFulfill = function (quantity) {
  return this.available >= quantity;
};

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;
