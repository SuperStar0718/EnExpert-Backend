const express = require("express");

const energyController = require("../controllers/energy");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

router.post(
  "/get-energy-graph",
  clientAuth,
  energyController.getEnergyGraphData
);

module.exports = router;
