const express = require("express");

const influxController = require("../controllers/influx");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

router.get("/test-influx", influxController.testInflux);

module.exports = router;
