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
          // this.unitPrice only works on CREATE, not UPDATE
          // For updates, you'd need a pre-save hook
          return !val || val < this.unitPrice;
        },
        message: 'Discount price {VALUE} must be less than the unit price',
      },
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
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

productsSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
});

// Create index for search perofrmance optimization
// create compound index
productsSchema.index({ title: 'text', description: 'text' });

/**
 * Pre-remove hook: Cleanup references when product is deleted
 * Removes product from all wishlists and carts
 */
productsSchema.pre('remove', async function (next) {
  const productId = this._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Remove from all wishlists
    await mongoose
      .model('Wishlist')
      .updateMany({ products: productId }, { $pull: { products: productId } })
      .session(session);

    // Remove from all carts
    await mongoose
      .model('Cart')
      .updateMany(
        { 'items.product': productId },
        { $pull: { items: { product: productId } } },
      )
      .session(session);

    await session.commitTransaction();
    session.endSession();

    next();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    next(error);
  }
});

/**
 * Pre-findOneAndDelete hook: Same cleanup for findByIdAndDelete
 */
productsSchema.pre('findOneAndDelete', async function (next) {
  const productId = this.getQuery()._id;

  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    await mongoose
      .model('Wishlist')
      .updateMany({ products: productId }, { $pull: { products: productId } })
      .session(session);

    await mongoose
      .model('Cart')
      .updateMany(
        { 'items.product': productId },
        { $pull: { items: { product: productId } } },
      )
      .session(session);

    await session.commitTransaction();
    session.endSession();
    next();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

const Product = mongoose.model('Product', productsSchema);

module.exports = Product;
