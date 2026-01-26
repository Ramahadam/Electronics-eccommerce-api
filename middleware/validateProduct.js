const { body, query, param, validationResult } = require('express-validator');

// Reusable validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'fail',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// Validation rules for creating products
const createProductValidation = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 40 })
    .withMessage('Title must be 10-40 characters')
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage('Title can only contain letters, numbers, and spaces'),

  body('price')
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Price must be between 0 and 1,000,000'),

  body('category')
    .isIn(['laptop', 'desktop', 'cctv', 'printer'])
    .withMessage('Invalid category'),

  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('brand')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Brand must be 2-50 characters'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be 10-500 characters'),

  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
    .custom((images) => {
      if (images.every((img) => /^https?:\/\/.+/.test(img))) {
        return true;
      }
      throw new Error('All images must be valid URLs');
    }),
];

// Validation rules for updating products
const updateProductValidation = [
  param('id').isMongoId().withMessage('Invalid product ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 10, max: 40 })
    .withMessage('Title must be 10-40 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Price must be between 0 and 1,000,000'),

  body('category')
    .isIn(['laptop', 'desktop', 'cctv', 'printer'])
    .withMessage('Invalid category'),

  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('brand')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Brand must be 2-50 characters'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be 10-500 characters'),

  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
    .custom((images) => {
      if (images.every((img) => /^https?:\/\/.+/.test(img))) {
        return true;
      }
      throw new Error('All images must be valid URLs');
    }),
];

// Query parameter validation
const queryValidation = [
  query('category')
    .optional()
    .isIn(['laptop', 'desktop', 'cctv', 'printer'])
    .withMessage('Invalid category filter'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be a positive number'),
];

module.exports = {
  validate,
  createProductValidation,
  updateProductValidation,
  queryValidation,
};
