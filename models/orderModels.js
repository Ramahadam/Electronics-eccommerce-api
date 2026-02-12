const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: [(val) => val.length > 0, 'Order must have at least one item'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
      index: true,
    },
    payment: {
      provider: String,
      intentId: String,
      paidAt: Date,
    },
    // IMPROVEMENT: Add audit trail fields
    // WHY: Track when status changes happen and who made them
    statusHistory: [
      {
        status: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        reason: String, // Optional: why the change was made
      },
    ],
    // IMPROVEMENT: Track cancellation details
    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      cancelledAt: Date,
      reason: String, // User/admin provided reason
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Clean up response
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// INDEXES FOR PERFORMANCE
// WHY: Common query patterns need optimization
orderSchema.index({ user: 1, status: 1 }); // Get user's orders by status
orderSchema.index({ status: 1, createdAt: -1 }); // Admin view: orders by status and date
orderSchema.index({ 'payment.intentId': 1 }); // Webhook lookups

// VIRTUAL: Calculate if order can be cancelled
// WHY: Encapsulate business logic in model
orderSchema.virtual('canBeCancelled').get(function () {
  const cancellableStatuses = ['pending', 'confirmed'];
  return cancellableStatuses.includes(this.status);
});

// VIRTUAL: Calculate if order is editable
orderSchema.virtual('isEditable').get(function () {
  return this.status === 'pending';
});

// PRE-SAVE HOOK: Add to status history
// WHY: Automatic audit trail without manual code in controllers
orderSchema.pre('save', function (next) {
  // Only add to history if status actually changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      // Note: changedBy would need to be set in controller
    });
  }
  next();
});

// METHODS
// Method to check if user can cancel this order
orderSchema.methods.canUserCancel = function () {
  return ['pending', 'confirmed'].includes(this.status);
};

// Method to check if admin can cancel this order
orderSchema.methods.canAdminCancel = function () {
  return this.status !== 'delivered';
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
