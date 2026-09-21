import mongoose from "mongoose";

const whatsNewViewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    whatsNew: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WhatsNew",
      required: true,
      index: true,
    },

    version: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    viewed: {
      type: Boolean,
      default: false,
    },

    explored: {
      type: Boolean,
      default: false,
    },

    viewedAt: {
      type: Date,
      default: null,
    },

    exploredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

whatsNewViewSchema.index(
  {
    user: 1,
    whatsNew: 1,
    version: 1,
  },
  {
    unique: true,
  }
);

const WhatsNewView = mongoose.model("WhatsNewView", whatsNewViewSchema);

export default WhatsNewView;
