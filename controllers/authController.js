const User = require('../models/userModels');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const sendEmail = require('../utils/sendEmail');

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
    role: req.body.role,
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

exports.protect = async (req, res, next) => {
  // 01) Getting token and check if it's there.
  const { authorization } = req.headers;
  let token;

  if (authorization && authorization.startsWith('Bearer')) {
    token = authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(404).json({
      status: 'fail',
      message: 'Token not found',
    });
  }
  // 02) Verification of token to verify if the token exists
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 03) Check if the user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return res.status(404).json({
      status: 'fail',
      message: 'User doesn not exist any more',
    });
  }
  const passwordHasChanged = currentUser.passwordChangedAfter(decoded.iat);

  // 04) Check if the user changed the password after the token was issued.
  if (passwordHasChanged) {
    res.status(400).json({
      status: 'fail',
      message: 'Password has been changed recently, please login again!!',
    });
  }

  req.user = currentUser;
  next();
};

exports.restrictTo = (restrctedRole) => {
  return (req, res, next) => {
    if (req.user.role !== restrctedRole) {
      res.status(401).json({
        status: 'failed',
        message: 'forbiden you are not authorized to perform this task',
      });
    }

    next();
  };
};

// Forgot password reset
exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne(req.body);

  // Check if the email exists in DB

  if (!Object.keys(user).length) {
    res.status(404).json({
      status: 'failed',
      message: "User doesn't exist",
    });
  }

  // Create a token
  const resetToken = user.createPassworResetToken();

  // Save the token into the db stop the validation
  await user.save({ validateBeforeSave: false });

  // Send the created token to the user email
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/forgotPassword/${resetToken}`;

  const message = `Hello you are recieving this email for password resetHello!You are receiving this email because
   we received a password reset request for your account.click the link ${resetUrl} this password link will expired in 10 minutes`;

  await sendEmail({
    subject: 'Reset password request',
    email: user.email,
    message,
  });

  res.status(200).json({
    status: 'success',
    message: 'password reset token has been sent to the email',
  });

  next();
};

exports.resetPassword = () => {};
