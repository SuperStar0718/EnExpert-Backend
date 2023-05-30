const fs = require("fs");
const AWS = require("aws-sdk");

exports.uploadImages = (req, res, next) => {
  try {
    if (req.files && req.files.length > 0) {
      const images = req.files?.map((file) => {
        return { ...file };
      });

      // console.log("upload func ", images);

      const imagesUrl = [];
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        Bucket: process.env.AWS_BUCKET_NAME,
      });

      // if (images.length > 0) {
      images.forEach((item) => {
        let extension = item.originalname.split(".");
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          ContentType: "image/jpeg",
          Key:
            Date.now().toString() +
            Math.random() * 10000 +
            `.${extension[extension.length - 1]}`,
          Body: item.buffer,
        };

        s3.upload(params, function (err, data) {
          if (!err) {
            imagesUrl.push(data.Location);
            if (imagesUrl.length == images.length) {
              req.awsImages = imagesUrl;
              next();
            }
          } else {
            const error = new Error(err);
            error.statusCode = 500;
            throw error;
          }
        });
      });
      // } else {
      //   const error = new Error("Image is required");
      //   error.statusCode = 500;
      //   throw error;
      // }
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.toString(),
    });
  }
};
