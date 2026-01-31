const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const DB = process.env.DB.replaceAll('<PASSWORD>', process.env.PASSWORD);

    await mongoose.connect(DB);
    console.log('DB connected ✅');
  } catch (err) {
    console.error('DB connection failed ❌', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
