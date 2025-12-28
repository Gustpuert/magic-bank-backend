const express = require("express");
const router = express.Router();
const { checkAccess } = require("./access.controller");
const authMiddleware = require("../auth/auth.middleware");

router.get("/check", authMiddleware, checkAccess);

module.exports = router;
