const express = require("express");

const logsController = require("../controllers/logs");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

router.post("/create", clientAuth, logsController.generateLogs);
router.get("/get", logsController.getAllLogs);

module.exports = router;
