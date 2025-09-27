const mongoose = require('mongoose');

const { Schema } = mongoose;

const productsSchema = new Schema({
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
    enum: ['laptop', 'desktop', 'cctv'],
  },
  avgRatings: Number,
  brand: {
    type: String,
    required: [true, 'Brand name is required'],
  },
  unitPrice: {
    type: String,
    required: [true, 'Unit price is required'],
  },
  discount: {
    type: Number,
    validator: {
      validate: function (val) {
        return val < this.price;
      },
      message: `The discount price {VALUE} must be less than the price`,
    },
  },
  stock: Number,
  description: {
    type: String,
    trim: true,
    maxLength: [100, 'A product max length is 100 characters'],
    minLength: [10, 'A product min length is 10 characters'],
  },
  specs: { type: Schema.Types.Mixed, default: {} },
});

productsSchema.set('toJSON', {
  virtuals: true,
});

const Product = mongoose.model('Product', productsSchema);

module.exports = Product;
