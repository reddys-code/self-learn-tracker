import mongoose from 'mongoose';

const DayProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayNumber: { type: Number, required: true, index: true, min: 1 },
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'blocked', 'complete'],
      default: 'not-started',
    },
    notes: { type: String, default: '' },
    evidenceUrl: { type: String, default: '' },
    completedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

DayProgressSchema.index({ userId: 1, dayNumber: 1 }, { unique: true });

export const DayProgress = mongoose.models.DayProgress || mongoose.model('DayProgress', DayProgressSchema);
