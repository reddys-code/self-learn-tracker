import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user', index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    themePreference: {
      themeName: { type: String, enum: ['light', 'dark', 'custom', 'system'], default: 'system' },
      customTheme: {
        primary: { type: String, default: '#0f766e' },
        background: { type: String, default: '#111827' },
        text: { type: String, default: '#f8fafc' },
      },
    },
    assignedCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: [] }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
