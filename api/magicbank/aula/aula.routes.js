const express = require("express");
const router = express.Router();

const aulaController = require("./aula.controller");

// 🔥 AQUÍ ESTABA EL PROBLEMA SI runAula NO EXISTÍA
router.post("/", aulaController.runAula);

module.exports = router;
