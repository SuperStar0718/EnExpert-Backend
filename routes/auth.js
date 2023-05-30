const express = require("express");

const authController = require("../controllers/auth");
const router = express.Router();

router.post("/forget-password", authController.forgetPassword);
router.post("/update-password", authController.updatePassword);
router.post("/verify-code", authController.verifyCode);

module.exports = router;
