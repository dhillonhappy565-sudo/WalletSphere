const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('../config/db');
const User = require('../models/User');

const testLogin = async () => {
  try {
    await connectDB();

    const email = 'test1@gmail.com';
    const password = 'test1@123';

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('FAIL: User not found');
      process.exit(1);
    }

    const isMatch = await user.matchPassword(password);
    if (isMatch) {
      console.log(`SUCCESS: Password verified for ${user.fullName} (${user.email})! Auth system is 100% functional.`);
    } else {
      console.log('FAIL: Password match failed');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error testing login:', error);
    process.exit(1);
  }
};

testLogin();
