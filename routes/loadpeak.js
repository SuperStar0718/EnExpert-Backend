const express = require("express");

const loadpeakController = require("../controllers/loadpeak");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

router.get("/get-max-load", clientAuth, loadpeakController.getMaxLoad);
router.post(
  "/get-electric-consumption",
  clientAuth,
  loadpeakController.getElectricConsumption
);

router.get(
  "/get-monthly-consumption",
  //   clientAuth,
  loadpeakController.getMonthlyConsumption
);

module.exports = router;
