const router = require("express").Router();

const Car = require("../models/Car");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const upload = require("../middleware/upload");

const {
  uploadBuffer,
  deleteCloudinaryImage,
} = require("../utils/cloudinaryUpload");

router.get("/", async (req, res, next) => {
  try {
    const cars = await Car.find({
      available: true,
    }).sort({ createdAt: -1 });

    res.json(cars);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  auth,
  admin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const name = String(
        req.body.name || ""
      ).trim();

      const pricePerDay = Number(
        req.body.pricePerDay
      );

      if (!name || !Number.isFinite(pricePerDay)) {
        return res.status(400).json({
          message: "Vehicle name and valid price are required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Vehicle image is required",
        });
      }

      const uploadedImage = await uploadBuffer(
        req.file.buffer,
        "ridego-bike-taxi/vehicles"
      );

      const car = await Car.create({
        name,
        brand: String(req.body.brand || "").trim(),
        vehicleType:
          req.body.vehicleType || "bike",
        type: String(req.body.type || "").trim(),
        seats: Number(req.body.seats || 5),
        pricePerDay,
        fuel: String(req.body.fuel || "").trim(),
        transmission: String(
          req.body.transmission || ""
        ).trim(),
        description: String(
          req.body.description || ""
        ).trim(),

        image: uploadedImage.secure_url,
        imagePublicId: uploadedImage.public_id,
      });

      res.status(201).json(car);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  auth,
  admin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const car = await Car.findById(
        req.params.id
      ).select("+imagePublicId");

      if (!car) {
        return res.status(404).json({
          message: "Vehicle not found",
        });
      }

      if (req.file) {
        const uploadedImage = await uploadBuffer(
          req.file.buffer,
          "ridego-bike-taxi/vehicles"
        );

        const oldPublicId = car.imagePublicId;

        car.image = uploadedImage.secure_url;
        car.imagePublicId =
          uploadedImage.public_id;

        if (oldPublicId) {
          await deleteCloudinaryImage(
            oldPublicId
          );
        }
      }

      const allowedFields = [
        "name",
        "brand",
        "vehicleType",
        "type",
        "fuel",
        "transmission",
        "description",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          car[field] = String(
            req.body[field]
          ).trim();
        }
      });

      if (req.body.seats !== undefined) {
        car.seats = Number(req.body.seats);
      }

      if (req.body.pricePerDay !== undefined) {
        car.pricePerDay = Number(
          req.body.pricePerDay
        );
      }

      if (req.body.available !== undefined) {
        car.available =
          req.body.available === "true" ||
          req.body.available === true;
      }

      await car.save();

      res.json(car);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const car = await Car.findById(
        req.params.id
      ).select("+imagePublicId");

      if (!car) {
        return res.status(404).json({
          message: "Vehicle not found",
        });
      }

      await deleteCloudinaryImage(
        car.imagePublicId
      );

      await car.deleteOne();

      res.json({
        message: "Vehicle deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;