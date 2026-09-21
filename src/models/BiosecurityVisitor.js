import mongoose from "mongoose";

const biosecurityVisitorSchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    visitorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },

    visitorType: {
      type: String,
      enum: ["VETERINARIAN", "SUPPLIER", "CUSTOMER", "STAFF", "CONTRACTOR", "GOVERNMENT", "DELIVERY", "OTHER"],
      default: "OTHER",
      index: true,
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    companyName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 30,
      default: "",
    },

    visitDate: {
      type: Date,
      required: true,
      index: true,
    },

    checkIn: {
      type: Date,
      required: true,
    },

    checkOut: {
      type: Date,
      default: null,
    },

    visitingShed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shed",
      default: null,
      index: true,
    },

    lastFarmVisitDate: {
      type: Date,
      default: null,
    },

    visitedOtherPoultryFarmRecently: {
      type: Boolean,
      default: false,
    },

    recentPoultryFarmDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    biosecurityMeasures: {
      maskUsed: {
        type: Boolean,
        default: false,
      },

      shoeCoverUsed: {
        type: Boolean,
        default: false,
      },

      handSanitized: {
        type: Boolean,
        default: false,
      },

      protectiveClothingUsed: {
        type: Boolean,
        default: false,
      },

      vehicleDisinfected: {
        type: Boolean,
        default: false,
      },
    },

    healthDeclaration: {
      symptomsReported: {
        type: Boolean,
        default: false,
      },

      details: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    recordedBy: {
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

biosecurityVisitorSchema.index({
  farm: 1,
  visitDate: -1,
});

biosecurityVisitorSchema.index({
  farm: 1,
  riskLevel: 1,
});

biosecurityVisitorSchema.index({
  visitingShed: 1,
  visitDate: -1,
});

const BiosecurityVisitor = mongoose.model("BiosecurityVisitor", biosecurityVisitorSchema);

export default BiosecurityVisitor;
