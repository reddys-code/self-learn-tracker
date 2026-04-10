import mongoose from 'mongoose';

const CourseProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    dayNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'blocked', 'complete'],
      default: 'not-started',
      index: true,
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

CourseProgressSchema.index({ userId: 1, courseId: 1, dayNumber: 1 }, { unique: true });

export const CourseProgress = mongoose.models.CourseProgress || mongoose.model('CourseProgress', CourseProgressSchema);
