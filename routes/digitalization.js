const express = require("express");

const digitalizationController = require("../controllers/digitalization");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

router.get(
  "/get-digitalization",
  clientAuth,
  digitalizationController.getDigitalization
);

router.post(
  "/get-histogram-data",
  clientAuth,
  digitalizationController.getHistogramData
);

module.exports = router;
