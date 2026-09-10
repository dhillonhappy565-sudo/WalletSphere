const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('../config/db');
const User = require('../models/User');

const seedTestUser = async () => {
  try {
    await connectDB();

    const email = 'test1@gmail.com';
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`User ${email} already exists in database. Updating password...`);
      existingUser.password = 'test1@123';
      existingUser.fullName = 'Test1';
      await existingUser.save();
      console.log(`SUCCESS: Updated existing user ${email} password to 'test1@123'`);
    } else {
      const user = await User.create({
        fullName: 'Test1',
        email: 'test1@gmail.com',
        password: 'test1@123',
        preferredCurrency: 'INR',
      });
      console.log(`SUCCESS: Created user ${user.fullName} (${user.email}) in MongoDB Atlas!`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error seeding user:', error);
    process.exit(1);
  }
};

seedTestUser();
