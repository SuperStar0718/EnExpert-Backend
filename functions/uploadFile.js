const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      //   file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      Date.now() + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    // file.mimetype === "application/msword" ||
    // file.mimetype ===
    //   "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    // file.mimetype === "application/vnd.ms-powerpoint" ||
    // file.mimetype ===
    //   "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    // file.mimetype === "application/vnd.ms-excel" ||
    // file.mimetype ===
    //   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype.includes("pdf") ||
    file.mimetype.includes("application")
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// const upload = multer({ storage, fileFilter });

module.exports = { storage, fileFilter };
