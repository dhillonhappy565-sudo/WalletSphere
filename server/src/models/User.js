const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please add a full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please add a valid email address',
      ],
    },
    password: {
      type: String,
      required: function() {
        return this.authProvider === 'email';
      },
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    preferredCurrency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP'],
    },
    phone: {
      type: String,
      default: '',
    },
    occupation: {
      type: String,
      default: '',
    },
    monthlyIncome: {
      type: Number,
      default: 0,
    },
    netWorth: {
      type: Number,
      default: 0,
    },
    incomeType: {
      type: String,
      enum: ['Salaried', 'Self-Employed', 'Freelance', 'Student', 'Retired', 'Other'],
      default: 'Salaried',
    },
    riskTolerance: {
      type: String,
      enum: ['Conservative', 'Moderate', 'Aggressive'],
      default: 'Moderate',
    },
    primaryFinancialGoal: {
      type: String,
      enum: ['Wealth Building', 'Debt Payoff', 'Emergency Savings', 'Retirement', 'Home Purchase', 'General Savings'],
      default: 'Wealth Building',
    },
    emergencyFundTargetMonths: {
      type: Number,
      default: 6,
      min: 1,
      max: 24,
    },
    profilePicture: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
