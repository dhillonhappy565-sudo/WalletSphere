const mongoose = require('mongoose');

const categoryRuleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    keyword: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      default: 'expense',
    },
    isExcludedFromSummary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique rule per user and keyword
categoryRuleSchema.index({ user: 1, keyword: 1 }, { unique: true });

const CategoryRule = mongoose.model('CategoryRule', categoryRuleSchema);
module.exports = CategoryRule;
