const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const { DB, PASSWORD } = process.env;
    if (!DB || !PASSWORD) {
      throw new Error('Missing DB or PASSWORD environment variables');
    }
    const connStr = DB.replaceAll('<PASSWORD>', PASSWORD);
    await mongoose.connect(connStr);
    console.log('DB connected ✅');
  } catch (err) {
    console.error('DB connection failed ❌', err.message);
    process.exit(1);
  }
};
module.exports = connectDB;
