const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a transaction description'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please add a transaction amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    type: {
      type: String,
      required: [true, 'Please specify transaction type'],
      enum: ['income', 'expense', 'transfer'],
    },
    category: {
      type: String,
      required: [true, 'Please specify category'],
      enum: [
        'Food',
        'Shopping',
        'Travel',
        'Entertainment',
        'Bills',
        'Healthcare',
        'Salary',
        'Investment',
        'Transfer & Reimbursement',
        'Others',
      ],
      default: 'Others',
    },
    isExcludedFromSummary: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'Auto Debit', 'Other'],
      default: 'UPI',
    },
    source: {
      type: String,
      enum: ['manual', 'csv', 'xlsx', 'pdf', 'gmail', 'import'],
      default: 'manual',
    },
    hash: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for Ultra-Fast Aggregation Queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, category: 1, date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
