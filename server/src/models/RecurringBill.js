const mongoose = require('mongoose');

const recurringBillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      default: 'Bills',
    },
    dueDateDay: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    autoDebit: {
      type: Boolean,
      default: false,
    },
    linkedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    lastUnpaidMonth: {
      type: String, // e.g. '2026-07' to suppress auto-match when user explicitly marks unpaid
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const RecurringBill = mongoose.model('RecurringBill', recurringBillSchema);
module.exports = RecurringBill;
