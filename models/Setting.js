const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ["paymentQr"],
    },

    value: {
      type: String,
      default: "",
    },

    publicId: {
      type: String,
      default: "",
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Setting",
  settingSchema
);