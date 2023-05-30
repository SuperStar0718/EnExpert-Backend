const express = require("express");

const homeController = require("../controllers/home");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

router.get(
  "/get-electric-consumption",
  clientAuth,
  homeController.getElectricConsumption
);

// router.get(
//   "/get-electric-consumption-demo",
//   clientAuth,
//   homeController.getElectricConsumption
// );

router.post("/get-energy-cost", clientAuth, homeController.getEnergyCost);
// router.post("/get-energy-cost", clientAuth, homeController.getEnergyCost);
router.post(
  "/get-total-electric-consumption",
  clientAuth,
  homeController.getTotalElectricConsumption
);

router.post(
  "/get-round-electric-consumption",
  clientAuth,
  homeController.getRoundChartData
);

router.post("/get-heat-map", clientAuth, homeController.getHeatMapData);
router.post("/get-pv-production", clientAuth, homeController.getPvProduction);
router.get("/get-power-qualtiy", clientAuth, homeController.getPowerQuality);

module.exports = router;
