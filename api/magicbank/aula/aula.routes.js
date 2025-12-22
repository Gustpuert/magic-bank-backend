aula.routes.js. const express = require("express");
const router = express.Router();

const { handleAulaMessage } = require("./aula.controller");

// Ruta de estado (MUY IMPORTANTE)
router.get("/", (req, res) => {
  res.json({
    status: "Aula MagicBank activa",
    service: "aula",
    version: "1.0.0"
  });
});

// Ruta principal del aula
router.post("/message", handleAulaMessage);

module.exports = router;
