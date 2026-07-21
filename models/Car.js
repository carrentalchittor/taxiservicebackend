const mongoose =
  require("mongoose");

const carSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: [
          true,
          "Vehicle name is required",
        ],
        trim: true,
        maxlength: [
          100,
          "Vehicle name is too long",
        ],
      },

      brand: {
        type: String,
        trim: true,
        maxlength: [
          70,
          "Brand name is too long",
        ],
        default: "",
      },

      vehicleType: {
        type: String,
        required: true,
        enum: {
          values: [
            "car",
            "bike",
            "scooty",
          ],
          message:
            "{VALUE} valid vehicle type nahi hai. Car, bike ya scooty select karein.",
        },
        default: "bike",
        index: true,
      },

      type: {
        type: String,
        trim: true,
        maxlength: [
          50,
          "Category is too long",
        ],
        default: "",
      },

      seats: {
        type: Number,
        min: [
          1,
          "Seats minimum 1 honi chahiye",
        ],
        max: [
          20,
          "Seats maximum 20 ho sakti hain",
        ],
        default: 5,
      },

      pricePerDay: {
        type: Number,
        required: [
          true,
          "Price per day is required",
        ],
        min: [
          0,
          "Price negative nahi ho sakti",
        ],
      },

      fuel: {
        type: String,
        trim: true,
        maxlength: [
          30,
          "Fuel value is too long",
        ],
        default: "",
      },

      transmission: {
        type: String,
        trim: true,
        maxlength: [
          30,
          "Transmission value is too long",
        ],
        default: "",
      },

      description: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Description is too long",
        ],
        default: "",
      },

      image: {
        type: String,
        required: [
          true,
          "Vehicle image is required",
        ],
      },

      imagePublicId: {
        type: String,
        required: [
          true,
          "Image public ID is required",
        ],
        select: false,
      },

      available: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

/*
 * Public home query:
 * find({ available: true }).sort({ createdAt: -1 })
 * ko fast banata hai.
 */
carSchema.index({
  available: 1,
  createdAt: -1,
});

/*
 * Filter queries ke liye.
 */
carSchema.index({
  vehicleType: 1,
  available: 1,
});

module.exports = mongoose.model(
  "Car",
  carSchema
);