const express = require("express");

const liveController = require("../controllers/live");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

router.get("/get-stats", clientAuth, liveController.getStats);
router.get(
  "/get-heat-consumption",
  clientAuth,
  liveController.getHeatConsumption
);
router.get(
  "/get-water-consumption",
  clientAuth,
  liveController.getWaterConsumption
);
router.get("/get-battery-levels", clientAuth, liveController.getBatteryLevels);
router.get(
  "/get-pv-production",
  clientAuth,
  liveController.getPvProductionLive
);

module.exports = router;
