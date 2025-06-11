const User = require('../models/userModels');
const jwt = require('jsonwebtoken');

function createToken(id) {
  return jwt.sign({ id }, `${process.env.JWT_SECRET}`, {
    expiresIn: `${process.env.JWT_EXPIRES_IN}`,
  });
}

exports.signup = async (req, res, next) => {
  // Create new user
  const newUser = await User.create({
    name: req.body.name,
    photo: req.body.photo,
    password: req.body.password,
    email: req.body.email,
    passwordConfirm: req.body.passwordConfirm,
  });

  // Create JSON webtoken and send the token to the client
  const token = createToken(newUser._id);

  res.status(201).json({
    status: 'success',
    data: {
      user: newUser,
    },
    token,
  });
};

exports.login = async (req, res, next) => {
  // Check if the email and passowrd field exists
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide email and password',
    });
  }

  // Check if the email exist in the collection - we are selecting password since it sets to false in schema
  const user = await User.findOne({ email }).select('+password');
  const correct = await user.correctPassowrd(req.body.password, user.password);

  if (user && correct) {
    const token = createToken(user._id);

    res.status(200).json({
      status: 'success',
      token,
      data: null,
    });
  }

  next();
};
