const cloudinary = require("../config/cloudinary");

function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",

        transformation: [
          {
            width: 1600,
            height: 1200,
            crop: "limit",
          },
          {
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}

module.exports = {
  uploadBuffer,
  deleteCloudinaryImage,
};