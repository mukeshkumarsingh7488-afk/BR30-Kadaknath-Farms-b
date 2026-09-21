import mongoose from "mongoose";

const staffAttendanceSchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEK_OFF"],
      default: "PRESENT",
      index: true,
    },

    checkIn: {
      type: Date,
      default: null,
    },

    checkOut: {
      type: Date,
      default: null,
    },

    totalHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    workLocation: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

staffAttendanceSchema.index(
  {
    farm: 1,
    staff: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

staffAttendanceSchema.index({
  farm: 1,
  date: -1,
});

staffAttendanceSchema.index({
  staff: 1,
  date: -1,
});

const StaffAttendance = mongoose.model("StaffAttendance", staffAttendanceSchema);

export default StaffAttendance;
