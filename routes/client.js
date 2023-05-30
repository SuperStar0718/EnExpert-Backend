const express = require("express");

const employeeController = require("../controllers/client");
const clientAuth = require("../middleware/clientAuth");
const router = express.Router();

router.get("/get-all", employeeController.getAll);
router.get("/get", clientAuth, employeeController.getClient);

router.post("/create", employeeController.create);
router.post("/login", employeeController.login);
router.post("/update", employeeController.update);
router.post(
  "/update-location",
  clientAuth,
  employeeController.updateClientLocation
);
router.post(
  "/update-loadpeak-actions",
  clientAuth,
  employeeController.updateLoadPeakActions
);
router.post("/update-password", clientAuth, employeeController.updatePassword);
router.post("/search", employeeController.search);

module.exports = router;
