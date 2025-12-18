const User = require('../models/userModels');
// const jwt = require('jsonwebtoken');
// const { promisify } = require('util');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const admin = require('../lib/firebase/firebase.config');

// function createToken(id) {
//   return jwt.sign({ id }, `${process.env.JWT_SECRET}`, {
//     expiresIn: `${process.env.JWT_EXPIRES_IN}`,
//   });
// }

// exports.signup = async (req, res, next) => {
//   // Create new user
//   const newUser = await User.create({
//     name: req.body.name,
//     photo: req.body.photo,
//     password: req.body.password,
//     email: req.body.email,
//     passwordConfirm: req.body.passwordConfirm,
//     role: req.body.role,
//   });

//   // Create JSON webtoken and send the token to the client
//   const token = createToken(newUser._id);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       user: newUser,
//     },
//     token,
//   });
// };

// exports.login = async (req, res, next) => {
//   // Check if the email and passowrd field exists
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Please provide email and password',
//     });
//   }

//   // Check if the email exist in the collection - we are selecting password since it sets to false in schema
//   const user = await User.findOne({ email }).select('+password');

//   const correct = await user.correctPassowrd(req.body.password, user.password);

//   if (user && correct) {
//     const token = createToken(user._id);

//     res.status(200).json({
//       status: 'success',
//       token,
//       data: null,
//     });
//   }

//   next();
// };

exports.protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not logged in' });

    const decoded = await admin.auth().verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email,
      });
    }

    req.auth = decoded;
    req.user = user;

    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// middleware/authMiddleware.js

// exports.verifyFirebaseToken = async (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader?.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'No token provided' });
//   }

//   const token = authHeader.split('Bearer ')[1];

//   console.log(token);

//   try {
//     const decodedToken = await admin.auth().verifyIdToken(token);
//     req.user = decodedToken; // includes uid, email, etc.
//     next();
//   } catch (error) {
//     console.error('Error verifying Firebase token:', error);
//     res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

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
  )}/api/v1/resetpassword/${resetToken}`;

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

// Reset password
exports.resetPassword = async (req, res, next) => {
  const resetToken = req.params.token;

  // Check if the token exist
  if (!resetToken) {
    res.status(404).json({
      status: 'failed',
      message: 'Token not found',
    });
  }
  // Encrypt the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Find the encrypted token in user documents
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gte: Date.now() },
  });
  // Check if the password token is not expirey
  if (!user) {
    res.status(404).json({
      status: 'failed',
      message: 'Token does not exist or expired',
    });
  }
  // Update the user password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // Set the token and expiry time to undefined
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;

  await user.save();
  // Send JWT to the user

  const jwtToken = createToken(user._id);

  res.status(200).json({
    status: 'success',
    token: jwtToken,
  });

  next();
};

// Update password by user - option by entering current password.

exports.updatePassword = async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  console.log(user);

  const isCorrectPassword = await user.correctPassowrd(
    currentPassword,
    user.password
  );

  if (!user || !isCorrectPassword) {
    res.status(404).json({
      status: 'failed',
      message: 'Incorrect password',
    });
  }

  user.password = newPassword;
  user.passwordConfirm = confirmPassword;
  await user.save();

  const token = createToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });

  next();
};
