const multer = require("multer");

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    callback(
      new Error("Only JPG, PNG and WEBP images are allowed")
    );
    return;
  }

  callback(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});