const express = require("express");
const router = express.Router();
const controller = require("./aula.controller");

// Endpoint principal del aula
router.post("/texto", controller.aulaTexto);

// Endpoint de prueba (muy importante)
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Aula MagicBank activa",
  });
});

module.exports = router;
