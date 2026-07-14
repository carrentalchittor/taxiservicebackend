const router = require("express").Router();

const Booking = require("../models/Booking");
const Car = require("../models/Car");

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.post("/", auth, async (req, res, next) => {
  try {
    const {
      car,
      pickupDate,
      returnDate,
      pickupLocation,
      dropLocation,
      tripType,
      note,
    } = req.body;

    const vehicle = await Car.findById(car);

    if (!vehicle || !vehicle.available) {
      return res.status(400).json({
        message: "Vehicle is not available",
      });
    }

    const startDate = new Date(pickupDate);
    const endDate = new Date(returnDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return res.status(400).json({
        message:
          "Return date must be after pickup date",
      });
    }

    const booking = await Booking.create({
      user: req.user.id,
      car,
      pickupDate: startDate,
      returnDate: endDate,
      pickupLocation: String(
        pickupLocation || ""
      ).trim(),
      dropLocation: String(dropLocation || "").trim(),
      tripType: String(tripType || "local").trim(),
      note: String(note || "").trim(),
    });

    const populatedBooking =
      await booking.populate("car");

    res.status(201).json(populatedBooking);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/mine",
  auth,
  async (req, res, next) => {
    try {
      const bookings = await Booking.find({
        user: req.user.id,
      })
        .populate("car")
        .sort({ createdAt: -1 });

      res.json(bookings);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const bookings = await Booking.find()
        .populate(
          "user",
          "name phone city"
        )
        .populate(
          "car",
          "name image pricePerDay"
        )
        .sort({ createdAt: -1 });

      res.json(bookings);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/status",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const allowedStatuses = [
        "pending",
        "approved",
        "rejected",
        "paid",
        "completed",
      ];

      if (
        !allowedStatuses.includes(
          req.body.status
        )
      ) {
        return res.status(400).json({
          message: "Invalid booking status",
        });
      }

      const booking =
        await Booking.findByIdAndUpdate(
          req.params.id,
          {
            status: req.body.status,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      res.json(booking);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/payment",
  auth,
  async (req, res, next) => {
    try {
      const paymentReference = String(
        req.body.paymentReference || ""
      ).trim();

      if (!paymentReference) {
        return res.status(400).json({
          message:
            "Payment reference is required",
        });
      }

      const booking = await Booking.findOne({
        _id: req.params.id,
        user: req.user.id,
      });

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      if (booking.status !== "approved") {
        return res.status(400).json({
          message:
            "Booking must be approved before payment",
        });
      }

      booking.paymentReference =
        paymentReference;
booking.status = "payment_submitted";
      await booking.save();

      res.json(booking);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;