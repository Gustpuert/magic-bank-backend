const express = require("express");
const router = express.Router();

/**
 * ===================================
 * CONECTOR CON SISTEMA INTERNO DE TUTORES
 * ===================================
 * La plataforma NO evalúa ni enseña.
 * Solo envía eventos y registra respuestas.
 */

// REGISTRO DE EVENTOS (fase 1 en memoria)
const tutorEvents = [];

/**
 * ===================================
 * ENVIAR EVENTO AL TUTOR
 * ===================================
 * POST /api/tutor/event
 */
router.post("/tutor/event", (req, res) => {
  const {
    student_id,
    faculty,
    module,
    action
  } = req.body;

  if (!student_id || !faculty || !action) {
    return res.status(400).json({
      error: "Evento incompleto"
    });
  }

  const event = {
    id: tutorEvents.length + 1,
    student_id,
    faculty,
    module: module || null,
    action,
    timestamp: new Date().toISOString(),
    status: "sent"
  };

  tutorEvents.push(event);

  // Aquí, en fase real:
  // → se envía el evento al sistema interno del tutor (API, webhook, cola, etc.)

  res.json({
    message: "Evento enviado al tutor",
    event
  });
});

/**
 * ===================================
 * RESPUESTA DEL TUTOR (CALLBACK)
 * ===================================
 * POST /api/tutor/response
 */
router.post("/tutor/response", (req, res) => {
  const {
    event_id,
    result,
    notes
  } = req.body;

  const event = tutorEvents.find(e => e.id === event_id);

  if (!event) {
    return res.status(404).json({
      error: "Evento no encontrado"
    });
  }

  event.status = "responded";
  event.result = result;
  event.notes = notes || null;
  event.responded_at = new Date().toISOString();

  res.json({
    message: "Respuesta del tutor registrada",
    event
  });
});

/**
 * ===================================
 * CONSULTAR EVENTOS DE UN ESTUDIANTE
 * ===================================
 * GET /api/tutor/events/:student_id
 */
router.get("/tutor/events/:student_id", (req, res) => {
  const events = tutorEvents.filter(
    e => e.student_id === req.params.student_id
  );

  res.json({
    student_id: req.params.student_id,
    events
  });
});

module.exports = router;
