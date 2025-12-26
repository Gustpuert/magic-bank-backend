const express = require("express");
const router = express.Router();
const { aulaTexto } = require("./aula.controller");

router.post("/texto", aulaTexto);

module.exports = router;
