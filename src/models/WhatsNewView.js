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

    /*
     * Current login session.
     *
     * Used only for every_login behavior.
     *
     * Same feature/version can still have only one tracking row.
     * On every new login this value is replaced with the new session ID.
     */
    loginSessionId: {
      type: String,
      trim: true,
      default: null,
      index: true,
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
