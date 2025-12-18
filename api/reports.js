const express = require("express");
const router = express.Router();
const { requireRole } = require("./auth-middleware");

/**
 * REPORTES INSTITUCIONALES
 * Solo Admin / Council
 */

router.get(
  "/reports/overview",
  requireRole(["admin"]),
  (req, res) => {
    res.json({
      message: "Reporte institucional",
      note: "Aquí va el agregado real desde DB en producción"
    });
  }
);

module.exports = router;
