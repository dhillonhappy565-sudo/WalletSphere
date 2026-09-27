const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const RecurringBill = require('../models/RecurringBill');
const generateToken = require('../utils/generateToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to format user response object
const formatUserResponse = (user, token) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  authProvider: user.authProvider || 'email',
  isEmailVerified: user.isEmailVerified || false,
  preferredCurrency: user.preferredCurrency || 'INR',
  phone: user.phone || '',
  occupation: user.occupation || '',
  monthlyIncome: user.monthlyIncome || 0,
  netWorth: user.netWorth || 0,
  incomeType: user.incomeType || 'Salaried',
  riskTolerance: user.riskTolerance || 'Moderate',
  primaryFinancialGoal: user.primaryFinancialGoal || 'Wealth Building',
  emergencyFundTargetMonths: user.emergencyFundTargetMonths || 6,
  profilePicture: user.profilePicture || '',
  createdAt: user.createdAt,
  token,
});

// @desc    Register new user & send real email verification
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

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });

    if (userExists) {
      return res.status(400).json({
        status: 'fail',
        message: 'User already exists with this email address',
      });
    }

    // Generate random verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = await User.create({
      fullName,
      email: email.toLowerCase().trim(),
      password,
      preferredCurrency: preferredCurrency || 'INR',
      authProvider: 'email',
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpire,
    });

    // Send real verification email (async)
    try {
      await sendVerificationEmail(user.email, verificationToken, user.fullName);
    } catch (mailErr) {
      console.error('Failed to send verification email during registration:', mailErr);
    }

    const token = generateToken(user._id);
    return res.status(201).json({
      status: 'success',
      message: 'Registration successful! Verification email sent.',
      data: formatUserResponse(user, token),
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Verify email address using token
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired email verification link.',
      });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Email address verified successfully!',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Email verification failed',
    });
  }
};

// @desc    Resend email verification token
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ status: 'fail', message: 'Email address is already verified.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(user.email, verificationToken, user.fullName);

    return res.status(200).json({
      status: 'success',
      message: 'Verification email sent! Check your inbox.',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to resend verification email',
    });
  }
};

// @desc    Request Password Reset Link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'fail', message: 'Please provide your email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    await sendPasswordResetEmail(user.email, resetToken, user.fullName);

    return res.status(200).json({
      status: 'success',
      message: 'Password reset email sent! Check your inbox.',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send password reset email',
    });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ status: 'fail', message: 'Invalid or expired password reset token.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const authToken = generateToken(user._id);

    return res.status(200).json({
      status: 'success',
      message: 'Password reset successful! You are now logged in.',
      data: formatUserResponse(user, authToken),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Password reset failed',
    });
  }
};

// @desc    Authenticate user via Google OAuth 2.0 ("Sign in with Google")
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { idToken, email, fullName, profilePicture } = req.body;
    let googleUserEmail = email;
    let googleUserName = fullName;
    let googleUserPic = profilePicture;

    if (idToken && process.env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        googleUserEmail = payload.email;
        googleUserName = payload.name;
        googleUserPic = payload.picture;
      } catch (err) {
        console.warn('Google ID token verification failed:', err.message);
      }
    }

    if (!googleUserEmail) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google login failed. Email address not provided.',
      });
    }

    let user = await User.findOne({ email: googleUserEmail.toLowerCase().trim() });

    if (!user) {
      user = await User.create({
        fullName: googleUserName || 'Google User',
        email: googleUserEmail.toLowerCase().trim(),
        authProvider: 'google',
        isEmailVerified: true,
        profilePicture: googleUserPic || '',
      });
    } else {
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        await user.save();
      }
    }

    const authToken = generateToken(user._id);

    return res.status(200).json({
      status: 'success',
      data: formatUserResponse(user, authToken),
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during Google authentication',
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

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      status: 'success',
      data: formatUserResponse(user, token),
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
        data: formatUserResponse(user),
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

// @desc    Update user profile & financial persona
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

    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.occupation !== undefined) user.occupation = req.body.occupation;
    if (req.body.monthlyIncome !== undefined) user.monthlyIncome = parseFloat(req.body.monthlyIncome) || 0;
    if (req.body.netWorth !== undefined) user.netWorth = parseFloat(req.body.netWorth) || 0;
    if (req.body.incomeType !== undefined) user.incomeType = req.body.incomeType;
    if (req.body.riskTolerance !== undefined) user.riskTolerance = req.body.riskTolerance;
    if (req.body.primaryFinancialGoal !== undefined) user.primaryFinancialGoal = req.body.primaryFinancialGoal;
    if (req.body.emergencyFundTargetMonths !== undefined) user.emergencyFundTargetMonths = parseInt(req.body.emergencyFundTargetMonths, 10) || 6;
    if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    const token = generateToken(updatedUser._id);

    return res.status(200).json({
      status: 'success',
      data: formatUserResponse(updatedUser, token),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error updating user profile',
    });
  }
};

// @desc    Export complete user data backup (JSON)
// @route   GET /api/auth/export-backup
// @access  Private
const exportUserData = async (req, res) => {
  try {
    const userId = req.user._id;
    const [user, transactions, budgets, bills] = await Promise.all([
      User.findById(userId).select('-password'),
      Transaction.find({ user: userId }).sort({ date: -1 }),
      Budget.find({ user: userId }),
      RecurringBill.find({ user: userId }),
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        user,
        transactions,
        budgets,
        bills,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error exporting user backup',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  googleAuth,
  getUserProfile,
  updateUserProfile,
  exportUserData,
};
