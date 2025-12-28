const express = require("express");
const router = express.Router();

const { validateSession } = require("./auth.controller");
const { verifyToken } = require("./auth.middleware");

router.get("/validate", verifyToken, validateSession);

module.exports = router;
