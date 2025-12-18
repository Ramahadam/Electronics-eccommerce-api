const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please enter a valid email address'],
      index: true,
    },

    photo: {
      type: String,
    },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },

    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
