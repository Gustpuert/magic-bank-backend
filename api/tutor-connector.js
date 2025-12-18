const express = require("express");
const router = express.Router();

/**
 * ===================================
 * CONECTOR Y REGISTRO ACADÉMICO
 * ===================================
 */

// EVENTOS ACADÉMICOS
let tutorEvents = [];

// HISTORIAL ACADÉMICO POR ESTUDIANTE
// { student_id: [ { type, faculty, module, result, tutor, date, notes } ] }
let academicHistory = {};

/**
 * REGISTRAR EN HISTORIAL
 */
function logHistory(student_id, entry) {
  if (!academicHistory[student_id]) {
    academicHistory[student_id] = [];
  }
  academicHistory[student_id].push(entry);
}

/**
 * ===================================
 * ENVIAR EVENTO AL TUTOR
 * ===================================
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

  logHistory(student_id, {
    type: "event_sent",
    faculty,
    module,
    action,
    date: event.created_at
  });

  res.json({
    message: "Evento enviado al tutor",
    event
  });
});

/**
 * ===================================
 * RESPUESTA DEL TUTOR
 * ===================================
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

  logHistory(event.student_id, {
    type: "tutor_response",
    faculty: event.faculty,
    module: event.module,
    result,
    tutor: "Tutor asignado",
    notes: notes || "",
    date: event.resolved_at
  });

  res.json({
    message: "Respuesta del tutor registrada",
    event
  });
});

/**
 * ===================================
 * HISTORIAL ACADÉMICO DEL ESTUDIANTE
 * ===================================
 * GET /api/student/:id/history
 */
router.get("/student/:id/history", (req, res) => {
  const { id } = req.params;

  res.json({
    student_id: id,
    history: academicHistory[id] || []
  });
});

module.exports = router;
