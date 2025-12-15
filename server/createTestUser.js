require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/second-brain');
    
    // Delete existing test user
    await User.deleteOne({ email: 'test@test.com' });
    
    // Create new test user
    const user = new User({
      name: 'Test User',
      email: 'test@test.com',
      password: '123456'
    });
    
    await user.save();
    console.log('Test user created successfully!');
    console.log('Email: test@test.com');
    console.log('Password: 123456');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
};

createTestUser();