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

const Stock = mongoose.model('Stock', stockSchema);
