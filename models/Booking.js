const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },

    pickupDate: {
      type: Date,
      required: true,
    },

    returnDate: {
      type: Date,
      required: true,
    },

    dropLocation: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    tripType: {
      type: String,
      enum: ["local", "one-way", "round-trip", "outstation"],
      default: "local",
    },

    pickupLocation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "payment_submitted",
        "rejected",
        "paid",
        "completed",
      ],
      default: "pending",
    },

    paymentReference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);