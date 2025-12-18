const express = require("express");
const router = express.Router();
const { requireRole } = require("./auth-middleware");

/**
 * ===================================
 * CONECTOR Y REGISTRO ACADÉMICO
 * ===================================
 */

let tutorEvents = [];
let academicHistory = {};

function logHistory(student_id, entry) {
  if (!academicHistory[student_id]) {
    academicHistory[student_id] = [];
  }
  academicHistory[student_id].push(entry);
}

/**
 * ENVIAR EVENTO AL TUTOR
 * Estudiante
 */
router.post(
  "/tutor/event",
  requireRole(["student"]),
  (req, res) => {
    const { student_id, faculty, module, action } = req.body;

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

    res.json({ event });
  }
);

/**
 * VER EVENTOS
 * Tutor / Admin
 */
router.get(
  "/tutor/events",
  requireRole(["tutor", "admin"]),
  (req, res) => {
    res.json({ events: tutorEvents });
  }
);

/**
 * RESPONDER EVENTO
 * Tutor
 */
router.post(
  "/tutor/respond",
  requireRole(["tutor"]),
  (req, res) => {
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
      notes,
      date: event.resolved_at
    });

    res.json({ event });
  }
);

/**
 * HISTORIAL DEL ESTUDIANTE
 * Estudiante (propio) / Admin
 */
router.get(
  "/student/:id/history",
  requireRole(["student", "admin"]),
  (req, res) => {
    res.json({
      student_id: req.params.id,
      history: academicHistory[req.params.id] || []
    });
  }
);

module.exports = router;
