const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    brand: {
      type: String,
      trim: true,
      maxlength: 70,
      default: "",
    },

    vehicleType: {
      type: String,
      enum: ["bike", "taxi"],
      default: "bike",
    },

    type: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },

    seats: {
      type: Number,
      min: 1,
      max: 20,
      default: 5,
    },

    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },

    fuel: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    transmission: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    image: {
      type: String,
      required: true,
    },

    imagePublicId: {
      type: String,
      required: true,
      select: false,
    },

    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Car", carSchema);