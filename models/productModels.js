const mongoose = require('mongoose');

const { Schema } = mongoose;

const productsSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxLength: [40, 'A product max length is 40 characters'],
      minLength: [10, 'A product min length is 10 characters'],
    },
    images: [
      {
        type: String,
      },
    ],
    category: {
      type: String,
      required: [true, 'Product category is required'],
      enum: {
        values: ['laptop', 'desktop', 'cctv'],
        message: '{VALUE} is not a valid category',
      },
    },
    avgRatings: Number,
    brand: {
      type: String,
      required: [true, 'Brand name is required'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      validate: {
        validator: function (val) {
          return val > 0;
        },
        message: 'The unit price must greater than 0 ',
      },
    },
    discount: {
      type: Number,
      validate: {
        validator: function (val) {
          return !val || val < this.unitPrice;
        },
        message: 'Discount price {VALUE} must be less than the unit price',
      },
    },
    description: {
      type: String,
      trim: true,
      maxLength: [100, 'A product max length is 100 characters'],
      minLength: [10, 'A product min length is 10 characters'],
    },
    specs: { type: Schema.Types.Mixed, default: {} },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// ========================================
// VIRTUAL FIELDS
// ========================================

/**
 * Virtual: Reviews
 * Original functionality - kept as is
 */
productsSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
});

/**
 * Virtual: Stock Record
 * NEW: Reference to Stock model (single warehouse)
 * Replaces embedded stock field
 */
productsSchema.virtual('stockInfo', {
  ref: 'Stock',
  localField: '_id',
  foreignField: 'product',
  justOne: true, // Single warehouse = one stock record per product
});

/**
 * Virtual: Available Stock (Computed)
 * Quick access to available quantity
 * Returns: quantity - reserved from Stock model
 */
productsSchema.virtual('availableStock').get(function () {
  if (this.stockInfo) {
    return this.stockInfo.quantity - this.stockInfo.reserved;
  }
  return 0; // No stock record = 0 available
});

/**
 * Virtual: Is In Stock (Boolean)
 * Quick check for stock availability
 */
productsSchema.virtual('inStock').get(function () {
  if (this.stockInfo) {
    return this.stockInfo.quantity - this.stockInfo.reserved > 0;
  }
  return false; // No stock record = not in stock
});

/**
 * Virtual: Stock Status
 * User-friendly status string
 * Returns: 'in_stock', 'low_stock', 'out_of_stock', 'unknown'
 */
productsSchema.virtual('stockStatus').get(function () {
  if (this.stockInfo) {
    return this.stockInfo.status;
  }
  return 'unknown'; // No stock record = unknown status
});

// ========================================
// INDEXES
// ========================================

// Text search index (original)
productsSchema.index({ title: 'text', description: 'text' });

// NEW: Additional indexes for filtering
productsSchema.index({ category: 1 });
productsSchema.index({ brand: 1 });
productsSchema.index({ unitPrice: 1 });

// ========================================
// PRE-HOOKS: Product Deletion Cleanup
// ========================================

/**
 * Pre-remove hook: Cleanup references when product is deleted
 * UPDATED: Added stock validation and cleanup
 */
productsSchema.pre('remove', async function (next) {
  const productId = this._id;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // ========================================
      // NEW: Stock validation before deletion
      // ========================================
      const Stock = mongoose.model('Stock');
      const stock = await Stock.findOne({ product: productId }).session(
        session,
      );

      if (stock) {
        // Check if stock is reserved
        if (stock.reserved > 0) {
          throw new Error(
            `Cannot delete product. ${stock.reserved} units are reserved for pending orders.`,
          );
        }

        // Optional: Check if stock exists
        if (stock.quantity > 0) {
          throw new Error(
            `Cannot delete product. ${stock.quantity} units still in stock. Adjust stock to 0 first.`,
          );
        }

        // Delete stock record
        await Stock.findOneAndDelete({ product: productId }, { session });
      }

      // ========================================
      // Original cleanup (wishlists & carts)
      // ========================================

      // Remove from all wishlists
      await mongoose
        .model('Wishlist')
        .updateMany(
          { products: productId },
          { $pull: { products: productId } },
          { session },
        );

      // Remove from all carts
      await mongoose
        .model('Cart')
        .updateMany(
          { 'items.product': productId },
          { $pull: { items: { product: productId } } },
          { session },
        );
    });

    await session.endSession();
    next();
  } catch (error) {
    await session.endSession();
    next(error);
  }
});

/**
 * Pre-findOneAndDelete hook: Same cleanup for findByIdAndDelete
 * UPDATED: Added stock validation and cleanup
 */
productsSchema.pre('findOneAndDelete', async function (next) {
  const productId = this.getQuery()._id;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // ========================================
      // NEW: Stock validation before deletion
      // ========================================
      const Stock = mongoose.model('Stock');
      const stock = await Stock.findOne({ product: productId }).session(
        session,
      );

      if (stock) {
        // Check if stock is reserved
        if (stock.reserved > 0) {
          throw new Error(
            `Cannot delete product. ${stock.reserved} units are reserved for pending orders.`,
          );
        }

        // Optional: Check if stock exists
        if (stock.quantity > 0) {
          throw new Error(
            `Cannot delete product. ${stock.quantity} units still in stock. Adjust stock to 0 first.`,
          );
        }

        // Delete stock record
        await Stock.findOneAndDelete({ product: productId }, { session });
      }

      // ========================================
      // Original cleanup (wishlists & carts)
      // ========================================

      // Remove from all wishlists
      await mongoose
        .model('Wishlist')
        .updateMany(
          { products: productId },
          { $pull: { products: productId } },
          { session },
        );

      // Remove from all carts
      await mongoose
        .model('Cart')
        .updateMany(
          { 'items.product': productId },
          { $pull: { items: { product: productId } } },
          { session },
        );
    });

    await session.endSession();
    next();
  } catch (error) {
    await session.endSession();
    next(error);
  }
});

/**
 * NEW: Pre-deleteOne hook
 * Additional safety for Product.deleteOne() calls
 */
productsSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function (next) {
    const productId = this._id;
    const Stock = mongoose.model('Stock');

    try {
      const stock = await Stock.findOne({ product: productId });

      if (stock) {
        if (stock.reserved > 0) {
          return next(
            new Error(
              `Cannot delete product. ${stock.reserved} units are reserved for pending orders.`,
            ),
          );
        }

        if (stock.quantity > 0) {
          return next(
            new Error(
              `Cannot delete product. ${stock.quantity} units still in stock. Adjust stock to 0 first.`,
            ),
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  },
);

const Product = mongoose.model('Product', productsSchema);

module.exports = Product;
