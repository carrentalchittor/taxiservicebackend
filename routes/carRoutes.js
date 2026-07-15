const router = require("express").Router();

const Car = require("../models/Car");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const upload = require("../middleware/upload");

const {
  uploadBuffer,
  deleteCloudinaryImage,
} = require("../utils/cloudinaryUpload");

const allowedVehicleTypes = [
  "car",
  "bike",
  "scooty",
];

function getVehicleType(value) {
  return String(value || "bike")
    .trim()
    .toLowerCase();
}

function getBooleanValue(value, defaultValue = true) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  return (
    value === true ||
    String(value).toLowerCase() === "true"
  );
}

// GET ALL AVAILABLE VEHICLES
router.get("/", async (req, res, next) => {
  try {
    const cars = await Car.find({
      available: true,
    }).sort({
      createdAt: -1,
    });

    res.json(cars);
  } catch (error) {
    next(error);
  }
});

// GET ALL VEHICLES FOR ADMIN
router.get(
  "/admin/all",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const cars = await Car.find({}).sort({
        createdAt: -1,
      });

      res.json(cars);
    } catch (error) {
      next(error);
    }
  }
);

// ADD VEHICLE
router.post(
  "/",
  auth,
  admin,
  upload.single("image"),
  async (req, res, next) => {
    let uploadedImage = null;

    try {
      const name = String(
        req.body.name || ""
      ).trim();

      const pricePerDay = Number(
        req.body.pricePerDay
      );

      const seats = Number(
        req.body.seats || 5
      );

      const vehicleType = getVehicleType(
        req.body.vehicleType
      );

      if (!name) {
        return res.status(400).json({
          message: "Vehicle name is required",
        });
      }

      if (
        !Number.isFinite(pricePerDay) ||
        pricePerDay < 0
      ) {
        return res.status(400).json({
          message:
            "Valid vehicle price is required",
        });
      }

      if (
        !Number.isFinite(seats) ||
        seats < 1 ||
        seats > 20
      ) {
        return res.status(400).json({
          message:
            "Seats 1 se 20 ke beech honi chahiye",
        });
      }

      if (
        !allowedVehicleTypes.includes(
          vehicleType
        )
      ) {
        return res.status(400).json({
          message:
            "Vehicle type car, bike ya scooty hona chahiye",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Vehicle image is required",
        });
      }

      uploadedImage = await uploadBuffer(
        req.file.buffer,
        "ridego-bike-taxi/vehicles"
      );

      const car = await Car.create({
        name,

        brand: String(
          req.body.brand || ""
        ).trim(),

        vehicleType,

        type: String(
          req.body.type || ""
        ).trim(),

        seats,

        pricePerDay,

        fuel: String(
          req.body.fuel || ""
        ).trim(),

        transmission: String(
          req.body.transmission || ""
        ).trim(),

        description: String(
          req.body.description || ""
        ).trim(),

        image: uploadedImage.secure_url,

        imagePublicId:
          uploadedImage.public_id,

        available: getBooleanValue(
          req.body.available,
          true
        ),
      });

      res.status(201).json(car);
    } catch (error) {
      // MongoDB save fail ho jaye to
      // uploaded Cloudinary image delete kar do
      if (uploadedImage?.public_id) {
        try {
          await deleteCloudinaryImage(
            uploadedImage.public_id
          );
        } catch (deleteError) {
          console.error(
            "NEW IMAGE CLEANUP ERROR:",
            deleteError
          );
        }
      }

      next(error);
    }
  }
);

// UPDATE VEHICLE
router.put(
  "/:id",
  auth,
  admin,
  upload.single("image"),
  async (req, res, next) => {
    let newUploadedImage = null;

    try {
      const car = await Car.findById(
        req.params.id
      ).select("+imagePublicId");

      if (!car) {
        return res.status(404).json({
          message: "Vehicle not found",
        });
      }

      const oldImagePublicId =
        car.imagePublicId;

      if (req.file) {
        newUploadedImage =
          await uploadBuffer(
            req.file.buffer,
            "ridego-bike-taxi/vehicles"
          );

        car.image =
          newUploadedImage.secure_url;

        car.imagePublicId =
          newUploadedImage.public_id;
      }

      if (req.body.name !== undefined) {
        const name = String(
          req.body.name
        ).trim();

        if (!name) {
          return res.status(400).json({
            message:
              "Vehicle name empty nahi ho sakta",
          });
        }

        car.name = name;
      }

      if (req.body.brand !== undefined) {
        car.brand = String(
          req.body.brand
        ).trim();
      }

      if (
        req.body.vehicleType !== undefined
      ) {
        const vehicleType =
          getVehicleType(
            req.body.vehicleType
          );

        if (
          !allowedVehicleTypes.includes(
            vehicleType
          )
        ) {
          return res.status(400).json({
            message:
              "Vehicle type car, bike ya scooty hona chahiye",
          });
        }

        car.vehicleType = vehicleType;
      }

      if (req.body.type !== undefined) {
        car.type = String(
          req.body.type
        ).trim();
      }

      if (req.body.fuel !== undefined) {
        car.fuel = String(
          req.body.fuel
        ).trim();
      }

      if (
        req.body.transmission !== undefined
      ) {
        car.transmission = String(
          req.body.transmission
        ).trim();
      }

      if (
        req.body.description !== undefined
      ) {
        car.description = String(
          req.body.description
        ).trim();
      }

      if (req.body.seats !== undefined) {
        const seats = Number(
          req.body.seats
        );

        if (
          !Number.isFinite(seats) ||
          seats < 1 ||
          seats > 20
        ) {
          return res.status(400).json({
            message:
              "Seats 1 se 20 ke beech honi chahiye",
          });
        }

        car.seats = seats;
      }

      if (
        req.body.pricePerDay !== undefined
      ) {
        const pricePerDay = Number(
          req.body.pricePerDay
        );

        if (
          !Number.isFinite(pricePerDay) ||
          pricePerDay < 0
        ) {
          return res.status(400).json({
            message:
              "Valid price per day required",
          });
        }

        car.pricePerDay = pricePerDay;
      }

      if (
        req.body.available !== undefined
      ) {
        car.available = getBooleanValue(
          req.body.available
        );
      }

      await car.save();

      // New image save hone ke baad
      // purani image delete karo
      if (
        newUploadedImage &&
        oldImagePublicId
      ) {
        try {
          await deleteCloudinaryImage(
            oldImagePublicId
          );
        } catch (deleteError) {
          console.error(
            "OLD IMAGE DELETE ERROR:",
            deleteError
          );
        }
      }

      const responseCar =
        await Car.findById(car._id);

      res.json(responseCar);
    } catch (error) {
      // Update fail hone par new uploaded image
      // ko Cloudinary se remove karo
      if (newUploadedImage?.public_id) {
        try {
          await deleteCloudinaryImage(
            newUploadedImage.public_id
          );
        } catch (deleteError) {
          console.error(
            "UPDATE IMAGE CLEANUP ERROR:",
            deleteError
          );
        }
      }

      next(error);
    }
  }
);

// DELETE VEHICLE
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

      const imagePublicId =
        car.imagePublicId;

      await car.deleteOne();

      if (imagePublicId) {
        try {
          await deleteCloudinaryImage(
            imagePublicId
          );
        } catch (deleteError) {
          console.error(
            "CLOUDINARY DELETE ERROR:",
            deleteError
          );
        }
      }

      res.json({
        message:
          "Vehicle deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;