import mongoose from "mongoose";

const farmSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
      unique: true,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    address: {
      line1: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      line2: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      village: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      district: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      pincode: {
        type: String,
        trim: true,
        maxlength: 10,
        default: "",
      },
    },

    contact: {
      phone: {
        type: String,
        trim: true,
        maxlength: 20,
        default: "",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 150,
        default: "",
      },
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },

    establishedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

farmSchema.index({
  owner: 1,
  createdAt: -1,
});

const Farm = mongoose.model("Farm", farmSchema);

export default Farm;
