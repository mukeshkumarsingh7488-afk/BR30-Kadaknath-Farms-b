import mongoose from "mongoose";

const farmReportSchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
      index: true,
    },

    reportType: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "BATCH", "YEARLY", "CUSTOM"],
      required: true,
      index: true,
    },

    periodStart: {
      type: Date,
      required: true,
      index: true,
    },

    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },

    revenue: {
      sales: {
        type: Number,
        default: 0,
        min: 0,
      },

      otherIncome: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalRevenue: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    expenses: {
      feed: {
        type: Number,
        default: 0,
        min: 0,
      },

      medicine: {
        type: Number,
        default: 0,
        min: 0,
      },

      vaccine: {
        type: Number,
        default: 0,
        min: 0,
      },

      chicks: {
        type: Number,
        default: 0,
        min: 0,
      },

      labor: {
        type: Number,
        default: 0,
        min: 0,
      },

      electricity: {
        type: Number,
        default: 0,
        min: 0,
      },

      water: {
        type: Number,
        default: 0,
        min: 0,
      },

      maintenance: {
        type: Number,
        default: 0,
        min: 0,
      },

      transport: {
        type: Number,
        default: 0,
        min: 0,
      },

      veterinary: {
        type: Number,
        default: 0,
        min: 0,
      },

      other: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalExpenses: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    profitability: {
      grossProfit: {
        type: Number,
        default: 0,
      },

      profitMarginPercentage: {
        type: Number,
        default: 0,
      },

      costPerBird: {
        type: Number,
        default: 0,
        min: 0,
      },

      revenuePerBird: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    birdStats: {
      openingBirds: {
        type: Number,
        default: 0,
        min: 0,
      },

      inwardBirds: {
        type: Number,
        default: 0,
        min: 0,
      },

      mortality: {
        type: Number,
        default: 0,
        min: 0,
      },

      closingBirds: {
        type: Number,
        default: 0,
        min: 0,
      },

      mortalityPercentage: {
        type: Number,
        default: 0,
        min: 0,
      },

      birdsSold: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    eggStats: {
      totalCollected: {
        type: Number,
        default: 0,
        min: 0,
      },

      goodEggs: {
        type: Number,
        default: 0,
        min: 0,
      },

      damagedEggs: {
        type: Number,
        default: 0,
        min: 0,
      },

      crackedEggs: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    feedStats: {
      totalConsumedKg: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalFeedCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      averageFeedPerBirdGram: {
        type: Number,
        default: 0,
        min: 0,
      },

      fcr: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    weightStats: {
      averageWeightKg: {
        type: Number,
        default: 0,
        min: 0,
      },

      weightGainKg: {
        type: Number,
        default: 0,
        min: 0,
      },

      averageDailyGainKg: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

farmReportSchema.index({
  farm: 1,
  reportType: 1,
  periodStart: -1,
});

farmReportSchema.index({
  farm: 1,
  batch: 1,
  periodStart: -1,
});

const FarmReport = mongoose.model("FarmReport", farmReportSchema);

export default FarmReport;
