const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, preferredCurrency } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide full name, email, and password',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        status: 'fail',
        message: 'User already exists with this email address',
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      preferredCurrency: preferredCurrency || 'INR',
    });

    if (user) {
      const token = generateToken(user._id);
      return res.status(201).json({
        status: 'success',
        data: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          preferredCurrency: user.preferredCurrency,
          profilePicture: user.profilePicture,
          token,
        },
      });
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid user data provided',
      });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide both email and password',
      });
    }

    // Find user by email (selecting password explicitly)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      status: 'success',
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        preferredCurrency: user.preferredCurrency,
        profilePicture: user.profilePicture,
        token,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during login',
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      return res.status(200).json({
        status: 'success',
        data: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          preferredCurrency: user.preferredCurrency,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt,
        },
      });
    } else {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error fetching user profile',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    user.fullName = req.body.fullName || user.fullName;
    user.preferredCurrency = req.body.preferredCurrency || user.preferredCurrency;
    if (req.body.profilePicture !== undefined) {
      user.profilePicture = req.body.profilePicture;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    const token = generateToken(updatedUser._id);

    return res.status(200).json({
      status: 'success',
      data: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        preferredCurrency: updatedUser.preferredCurrency,
        profilePicture: updatedUser.profilePicture,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error updating user profile',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};
