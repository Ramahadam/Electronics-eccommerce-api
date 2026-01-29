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
        values: ['laptop', 'desktop', 'cctv', 'printer'],
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

const Product = mongoose.model('Product', productsSchema);

module.exports = Product;
