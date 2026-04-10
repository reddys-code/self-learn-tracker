import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, default: 'link', trim: true },
    description: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const DaySectionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const CourseDaySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true },
    dayType: { type: String, default: 'Weekday' },
    hours: { type: String, default: '5h' },
    title: { type: String, required: true, trim: true },
    objective: { type: String, default: '', trim: true },
    sections: { type: [DaySectionSchema], default: [] },
    primaryDeliverable: { type: String, default: '', trim: true },
    materials: { type: [AttachmentSchema], default: [] },
    tags: { type: [String], default: [] },
    searchText: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const CourseWeekSchema = new mongoose.Schema(
  {
    weekNumber: { type: Number, required: true },
    phaseLabel: { type: String, default: '', trim: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '', trim: true },
    accent: { type: String, default: '#2e6ca5', trim: true },
    deliverables: { type: [String], default: [] },
    days: { type: [CourseDaySchema], default: [] },
  },
  { _id: false }
);

const CourseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    level: { type: String, default: 'Intermediate', trim: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    shortDescription: { type: String, default: '', trim: true },
    tagline: { type: String, default: '', trim: true },
    durationDays: { type: Number, default: 0 },
    brochure: {
      eyebrow: { type: String, default: '', trim: true },
      headline: { type: String, default: '', trim: true },
      lead: { type: String, default: '', trim: true },
      strapTitle: { type: String, default: '', trim: true },
      strapText: { type: String, default: '', trim: true },
      pdfUrl: { type: String, default: '', trim: true },
      heroImageUrl: { type: String, default: '', trim: true },
      chips: { type: [String], default: [] },
      audience: { type: [String], default: [] },
      outcomes: { type: [String], default: [] },
      differentiators: { type: [String], default: [] },
      cadence: { type: [String], default: [] },
      timeline: {
        type: [
          new mongoose.Schema(
            {
              phase: { type: String, default: '', trim: true },
              title: { type: String, default: '', trim: true },
              description: { type: String, default: '', trim: true },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
    },
    stats: {
      type: [
        new mongoose.Schema(
          {
            value: { type: String, default: '', trim: true },
            label: { type: String, default: '', trim: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    downloads: { type: [AttachmentSchema], default: [] },
    featuredScreens: { type: [String], default: [] },
    weeks: { type: [CourseWeekSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
