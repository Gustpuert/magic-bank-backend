const express = require("express");
const router = express.Router();

const { registerAuto, verifyToken } = require("./auth.controller");
const { authMiddleware } = require("./auth.middleware");

router.post("/register-auto", registerAuto);
router.get("/verify", authMiddleware, verifyToken);

module.exports = router;
