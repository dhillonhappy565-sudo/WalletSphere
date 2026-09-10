const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
    },
    monthlyLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly',
    },
    customStartDate: {
      type: Date,
      default: null,
    },
    customEndDate: {
      type: Date,
      default: null,
    },
    month: {
      type: String, // 'YYYY-MM' format for monthly
      required: true,
    },
    rolloverEnabled: {
      type: Boolean,
      default: false,
    },
    rolloverAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique budget per user, category, and month
budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);
module.exports = Budget;
