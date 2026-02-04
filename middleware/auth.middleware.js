const User = require('../models/userModels');
const admin = require('../lib/firebase/firebase.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Helper function (private, not exported)
const verifyToken = async (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new AppError('No token provided', 401);

  const decoded = await admin.auth().verifyIdToken(token);
  return { decoded, token };
};

// Middleware: Verify Firebase token and attach to req
exports.protect = catchAsync(async (req, res, next) => {
  const { decoded, token } = await verifyToken(req);

  if (!token || !decoded) {
    throw new AppError('Invalid token or failed to verify token', 401);
  }

  req.auth = decoded;
  req.firebaseUid = decoded.uid;

  next();
});

// Middleware: Fetch user from DB and attach userId
exports.appendUserId = catchAsync(async (req, res, next) => {
  if (!req.firebaseUid) {
    throw new AppError(
      'Firebase UID not found. Use protect middleware first.',
      500,
    );
  }

  const user = await User.findOne({ firebaseUid: req.firebaseUid });

  if (!user) {
    throw new AppError('User not found in database', 404);
  }

  req.userId = user.id;
  req.user = user; // Also attach full user object for restrictTo

  next();
});

// Middleware: Check if user has required role
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError(
        'User not found. Use appendUserId middleware first.',
        500,
      );
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        'You do not have permission to perform this action',
        403,
      );
    }

    next();
  };
};
