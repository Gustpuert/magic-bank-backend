const express = require("express");
const router = express.Router();

const controller = require("./aula.controller");

// ✅ Ruta real y existente
const authMiddleware = require("../../auth/auth.middleware");

router.post("/texto", authMiddleware, controller.aulaTexto);

module.exports = router;
