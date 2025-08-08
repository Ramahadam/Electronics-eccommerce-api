const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;
// ES5
const validator = require('validator');

const userSchema = new Schema({
  name: {
    required: [true, 'Please provide name'],
    minLength: 8,
    type: String,
  },
  email: {
    type: String,
    required: [true, 'Please provide email id'],
    unique: [true, 'Email must be unique'],
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please enter valid email address'],
  },
  photo: String,
  password: {
    type: String,
    required: [true, 'Please provide password'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm the password'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: `Password doesn't match`,
    },
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
  },
});

// Mongoose pre save middleware

userSchema.pre('save', async function (next) {
  //want to encrypt the password only if we create the filed or update password field.
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

// Function to compare the hashed password with inputed password for login
userSchema.methods.correctPassowrd = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.passwordChangedAfter = function (tokenIssueAt) {
  if (!this.passwordChangedAt) {
    return false;
  }

  if (this.passwordChangedAt) {
    const passowrdChangeAtDb = parseInt(
      this.passwordChangedAt.getTime() / 1000
    );

    return tokenIssueAt < passowrdChangeAtDb;
  }

  return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
