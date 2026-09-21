import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["none", "image", "video"],
      default: "none",
    },

    url: {
      type: String,
      trim: true,
      default: "",
    },

    poster: {
      type: String,
      trim: true,
      default: "",
    },

    autoplay: {
      type: Boolean,
      default: false,
    },

    muted: {
      type: Boolean,
      default: true,
    },

    controls: {
      type: Boolean,
      default: true,
    },

    loop: {
      type: Boolean,
      default: false,
    },

    playsInline: {
      type: Boolean,
      default: true,
    },

    volume: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
  },
  {
    _id: false,
  }
);

const whatsNewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    media: {
      type: mediaSchema,
      default: () => ({}),
    },

    targetRoles: {
      type: [
        {
          type: String,
          enum: ["all", "admin", "staff", "fm", "security", "customer"],
        },
      ],
      default: ["all"],
      index: true,
    },

    version: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
      default: "1.0",
    },

    displayMode: {
      type: String,
      enum: ["every_login", "once", "until_explored", "once_per_version"],
      default: "once_per_version",
      index: true,
    },

    cta: {
      enabled: {
        type: Boolean,
        default: false,
      },

      text: {
        type: String,
        trim: true,
        maxlength: 80,
        default: "",
      },

      route: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
    },

    published: {
      type: Boolean,
      default: false,
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    publishAt: {
      type: Date,
      default: null,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

whatsNewSchema.index({
  published: 1,
  active: 1,
  order: 1,
});

whatsNewSchema.index({
  targetRoles: 1,
  published: 1,
  active: 1,
});

const WhatsNew = mongoose.model("WhatsNew", whatsNewSchema);

export default WhatsNew;
