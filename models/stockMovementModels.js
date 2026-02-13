const mongoose = require('mongoose');
const Stock = require('./stockModels');
const AppError = require('../utils/appError');
const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Movement type is required'],
      enum: {
        values: [
          'initial', // Initial stock setup
          'purchase', // New stock from supplier
          'sale', // Stock reserved for order
          'confirmed_sale', // Payment confirmed, stock sold
          'return', // Order cancelled, stock returned
          'adjustment', // Manual admin correction
          'damaged', // Stock marked as damaged/lost
        ],
        message: '{VALUE} is not a valid movement type',
      },
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      // Positive = stock added (purchase, return)
      // Negative = stock removed (sale, damaged)
    },
    balanceBefore: {
      type: Number,
      required: [true, 'Balance before is required'],
      min: [0, 'Balance cannot be negative'],
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after is required'],
      min: [0, 'Balance cannot be negative'],
      validate: {
        validator: function (value) {
          // Validate: balanceAfter = balanceBefore + quantity
          return value === this.balanceBefore + this.quantity;
        },
        message: 'Balance after must equal balance before plus quantity',
      },
    },
    // References (for traceability)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Metadata
    reason: {
      type: String,
      trim: true,
      maxLength: [500, 'Reason cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxLength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation
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

//INDEXES
stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ orderId: 1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });
stockMovementSchema.index({ usrId: 1, createdAt: -1 });

// VIRTUAL FIELDS

/**
 * Movement direction (in or out)
 */
stockMovementSchema.virtual('direction').get(function () {
  return this.quantity >= 0 ? 'in' : 'out';
});

/**
 * Absolute quantity (for display)
 */
stockMovementSchema.virtual('absoluteQuantity').get(function () {
  return Math.abs(this.quantity);
});

// STATIC METHODS

/**
 * Create stock movement with automatic balance calculation
 *
 * This is the ONLY way to create movements (ensures consistency)
 *
 * @param {Object} data - Movement data
 * @param {ObjectId} data.product - Product ID
 * @param {String} data.type - Movement type
 * @param {Number} data.quantity - Quantity change
 * @param {ObjectId} [data.orderId] - Order ID (optional)
 * @param {ObjectId} [data.userId] - User ID (optional)
 * @param {String} [data.reason] - Reason for change
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object} Created movement
 */

stockMovementSchema.statics.createMovement = async function (
  data,
  session = null,
) {
  const Stock = mongoose.model('Stock');

  // Get current stock balance
  const stock = await Stock.findOne({ product: data.product }).session(session);

  if (!stock) {
    throw new Error('Stock record not found for product');
  }

  // Create movement with calculated balances
  const [movement] = await this.create(
    [
      {
        ...data,
        balanceBefore: stock.quantity,
        balanceAfter: stock.quantity + data.quantity,
      },
    ],
    { session },
  );

  return movement;
};

/**
 * Get movement history for a product
 *
 * @param {ObjectId} productId - Product ID
 * @param {Object} options - Query options
 * @param {Number} options.limit - Results limit
 * @param {Number} options.skip - Results skip
 * @param {String} options.type - Filter by type
 * @returns {Array} Movement records
 */

stockMovementSchema.statics.getProductHistory = async function (
  productId,
  options,
) {
  const { skip, limit, type } = options;

  const query = { product: productId };
  if (type) query.type = type;

  return this.find(query)
    .populate('userId', 'fullname email')
    .populate('orderId', 'status totalAmount')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Get movement history for an order
 *
 * @param {ObjectId} orderId - Order ID
 * @returns {Array} Movement records
 */
stockMovementSchema.statics.getOrderMovements = async function (orderId) {
  return this.find({ orderId })
    .populate('product', 'title images')
    .sort({ createdAt: 1 });
};
