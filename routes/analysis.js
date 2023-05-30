const express = require("express");

const analysisController = require("../controllers/analysis");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

// router.post("/get-analysis", analysisController.getAnalysisData);
// router.post("/get-analysis", clientAuth, analysisController.getAnalysisData2);
router.post("/get-analysis", clientAuth, analysisController.getAnalysisData);

module.exports = router;
