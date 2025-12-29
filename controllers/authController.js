const User = require('../models/userModels');

const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const admin = require('../lib/firebase/firebase.config');

const verifyToken = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = await admin.auth().verifyIdToken(token);

  return { decoded, token };
};

exports.protect = async (req, res, next) => {
  try {
    const { decoded, token } = await verifyToken(req);

    if (!token || !decoded) {
      return res
        .status(401)
        .json({ message: 'Invalid token or failed to verify token' });
    }

    req.auth = decoded;
    req.firebaseUid = decoded.uid;

    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.syncUser = async (req, res) => {
  try {
    if (!req.firebaseUid) {
      return res.status(401).json({
        status: 'failed',
        message: 'Unauthorized',
      });
    }

    const fullname = req?.body?.fullname || req?.auth?.name || null;

    let user = await User.findOne({ firebaseUid: req.firebaseUid });

    // Create user if not exists
    if (!user) {
      user = await User.create({
        firebaseUid: req.auth.uid,
        email: req.auth.email,
        fullname, // Google displayName fallback
      });

      return res.status(201).json({
        status: 'success',
        user,
      });
    }

    // Optional patch: fill missing fullname later
    if (!user.fullname && fullname) {
      user.fullname = fullname;
      await user.save();
    }

    return res.status(200).json({
      status: 'success',
      user,
    });
  } catch (err) {
    return res.status(400).json({
      status: 'failed',
      err: err,
    });
  }
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
