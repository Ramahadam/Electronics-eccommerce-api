const mongoose = require('mongoose');

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
