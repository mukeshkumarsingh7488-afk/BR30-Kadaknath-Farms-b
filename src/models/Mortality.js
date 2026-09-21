import mongoose from "mongoose";

const mortalitySchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    shed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    cause: {
      type: String,
      enum: ["DISEASE", "WEAKNESS", "INJURY", "PREDATOR", "WEATHER", "TRANSPORT", "UNKNOWN", "OTHER"],
      default: "UNKNOWN",
      index: true,
    },

    causeDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    ageInDays: {
      type: Number,
      min: 0,
      default: null,
    },

    maleCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    femaleCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    disposed: {
      type: Boolean,
      default: false,
    },

    disposalMethod: {
      type: String,
      enum: ["BURIAL", "INCINERATION", "COMPOSTING", "AUTHORIZED_DISPOSAL", "OTHER"],
      default: null,
    },

    disposalDate: {
      type: Date,
      default: null,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

mortalitySchema.index({
  farm: 1,
  batch: 1,
  date: -1,
});

mortalitySchema.index({
  shed: 1,
  date: -1,
});

const Mortality = mongoose.model("Mortality", mortalitySchema);

export default Mortality;
