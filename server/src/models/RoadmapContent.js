import mongoose from 'mongoose';

const RoadmapContentSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    hero: { type: mongoose.Schema.Types.Mixed, default: {} },
    stats: { type: [mongoose.Schema.Types.Mixed], default: [] },
    introCards: { type: [mongoose.Schema.Types.Mixed], default: [] },
    phases: { type: [mongoose.Schema.Types.Mixed], default: [] },
    checkpoints: { type: [mongoose.Schema.Types.Mixed], default: [] },
    weeks: { type: [mongoose.Schema.Types.Mixed], default: [] },
    artifacts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    screens: { type: [mongoose.Schema.Types.Mixed], default: [] },
    designSprints: { type: [mongoose.Schema.Types.Mixed], default: [] },
    downloads: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  {
    timestamps: true,
    minimize: false,
    versionKey: false,
  }
);

export const RoadmapContent = mongoose.models.RoadmapContent || mongoose.model('RoadmapContent', RoadmapContentSchema);
