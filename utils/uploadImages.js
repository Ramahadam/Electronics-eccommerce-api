const pLimit = require('p-limit');

// If you're uploading a large number of images, consider using a different upload
// method like p-limit. This enables you to concurrently utilize promises while
// controlling the maximum number of simultaneous executions. Install p-limit using npm install p-limit.
// Also clodinary free plan has limit of 10 concurrently number of upload which is 10
// https://cloudinary.com/documentation/upload_multiple_assets_in_node_tutorial
const limit = pLimit(10);
// Require the cloudinary library for uploading images
const cloudinary = require('cloudinary').v2;

// Return "https" URLs by setting secure: true
cloudinary.config({
  secure: true,
});

/////////////////////////
// Uploads an image file
/////////////////////////
exports.uploadImage = async (images) => {
  // Use the uploaded file's name as the asset's public ID and
  // allow overwriting the asset with new versions
  // const options = {
  //   use_filename: true,
  //   unique_filename: false,
  //   overwrite: true,
  // };

  try {
    // Batch upload using p-limit
    const imagesUpload = images.map((image) => {
      return limit(async () => {
        const result = await cloudinary.uploader.upload(image);
        return result;
      });
    });

    const res = await Promise.all(imagesUpload);
    const arrOfImages = res.map((img) => img.secure_url);
    return arrOfImages;
  } catch (error) {
    console.error(error);
  }
};
