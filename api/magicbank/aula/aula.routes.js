const express = require("express");
const router = express.Router();

const { handleAulaMessage } = require("./aula.controller");

router.post("/message", handleAulaMessage);

module.exports = router;
