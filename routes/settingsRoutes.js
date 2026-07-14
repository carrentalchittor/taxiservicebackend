const router = require("express").Router();

const Setting = require("../models/Setting");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const upload = require("../middleware/upload");

const {
  uploadBuffer,
  deleteCloudinaryImage,
} = require("../utils/cloudinaryUpload");

router.get("/public", async (req, res, next) => {
  try {
    const paymentQr = await Setting.findOne({
      key: "paymentQr",
    });

    res.json({
      paymentQr: paymentQr?.value || "",
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/payment-qr",
  auth,
  admin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "QR image is required",
        });
      }

      const uploadedImage = await uploadBuffer(
        req.file.buffer,
        "ridego-bike-taxi/payment-qr"
      );

      const oldSetting = await Setting.findOne({
        key: "paymentQr",
      }).select("+publicId");

      const oldPublicId =
        oldSetting?.publicId || "";

      const setting =
        await Setting.findOneAndUpdate(
          {
            key: "paymentQr",
          },
          {
            value: uploadedImage.secure_url,
            publicId: uploadedImage.public_id,
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
          }
        );

      if (oldPublicId) {
        await deleteCloudinaryImage(
          oldPublicId
        );
      }

      res.json({
        message: "Payment QR updated",
        paymentQr: setting.value,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;