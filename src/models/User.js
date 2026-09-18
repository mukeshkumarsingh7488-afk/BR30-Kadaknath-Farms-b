import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },

    addressLine1: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    addressLine2: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    pincode: {
      type: String,
      trim: true,
      maxlength: 10,
      default: "",
    },

    landmark: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer",
      index: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: true,
    },

    profilePicture: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },

    address: {
      type: addressSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
