const express = require("express");
const router = express.Router();

/**
 * ===================================
 * CONECTOR CON SISTEMA DE TUTORES
 * ===================================
 */

let tutorEvents = [];

/**
 * ENVIAR EVENTO AL TUTOR
 * POST /api/tutor/event
 */
router.post("/tutor/event", (req, res) => {
  const { student_id, faculty, module, action } = req.body;

  if (!student_id || !faculty || !action) {
    return res.status(400).json({ error: "Evento incompleto" });
  }

  const event = {
    id: tutorEvents.length + 1,
    student_id,
    faculty,
    module: module || null,
    action,
    status: "pending",
    created_at: new Date().toISOString()
  };

  tutorEvents.push(event);

  res.json({
    message: "Evento enviado al tutor",
    event
  });
});

/**
 * LISTAR EVENTOS (PANEL DEL TUTOR)
 * GET /api/tutor/events
 */
router.get("/tutor/events", (req, res) => {
  res.json({
    events: tutorEvents
  });
});

/**
 * RESPONDER EVENTO (TUTOR)
 * POST /api/tutor/respond
 */
router.post("/tutor/respond", (req, res) => {
  const { event_id, result, notes } = req.body;

  const event = tutorEvents.find(e => e.id === event_id);

  if (!event) {
    return res.status(404).json({ error: "Evento no encontrado" });
  }

  event.status = "resolved";
  event.result = result;
  event.notes = notes || null;
  event.resolved_at = new Date().toISOString();

  res.json({
    message: "Respuesta del tutor registrada",
    event
  });
});

module.exports = router;
