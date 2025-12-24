const express = require("express");
const router = express.Router();
const controller = require("./aula.controller");

router.post("/texto", controller.aulaTexto);
router.post("/voz", controller.aulaVoz);

module.exports = router;
