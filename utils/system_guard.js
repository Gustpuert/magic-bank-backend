/**
 * system_guard.js
 *
 * Guardia del sistema MagicBank.
 * Este módulo protege los tutores sellados y evita cualquier
 * manipulación accidental desde el backend.
 */

const fs = require("fs");
const path = require("path");

const SYSTEM_RULE_PATH = path.join(__dirname, "system_rule_madre_magicbank.md");
const REGISTRY_PATH = path.join(__dirname, "tutors_registry.json");

function loadSystemRule() {
  if (!fs.existsSync(SYSTEM_RULE_PATH)) {
    throw new Error("System rule file not found");
  }
  return fs.readFileSync(SYSTEM_RULE_PATH, "utf8");
}

function loadTutorsRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error("Tutors registry file not found");
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

/**
 * Valida si el backend puede interactuar con un tutor
 * sin violar las reglas del sistema.
 */
function validateTutorAccess(tutorName) {
  const registry = loadTutorsRegistry();
  const tutor = registry[tutorName];

  if (!tutor) {
    throw new Error(`Tutor "${tutorName}" is not registered`);
  }

  if (tutor.mode === "sealed") {
    return {
      allowed: false,
      reason: "Tutor is sealed and cannot be modified or built by backend"
    };
  }

  return {
    allowed: true,
    tutor
  };
}

module.exports = {
  loadSystemRule,
  loadTutorsRegistry,
  validateTutorAccess
};
