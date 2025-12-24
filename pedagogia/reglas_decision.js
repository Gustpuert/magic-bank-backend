/**
 * Reglas de decisión pedagógica MagicBank
 * Este módulo no genera texto.
 * Solo decide la acción pedagógica a tomar.
 */

function decidirAccionPedagogica(estado) {
  /*
    estado esperado (ejemplo):
    {
      precisionConceptual: boolean,
      coherenciaLogica: boolean,
      transferencia: boolean,
      autonomia: "alta" | "media" | "baja",
      velocidad: "alta" | "media" | "baja",
      errorPersistente: boolean
    }
  */

  // 1. Error persistente → cambio fuerte de enfoque
  if (estado.errorPersistente) {
    return {
      accion: "cambiar_enfoque",
      instruccion: "Reexplica desde un enfoque completamente distinto, usando ejemplos más simples y cotidianos."
    };
  }

  // 2. Falla conceptual o lógica → retroceder de capa
  if (!estado.precisionConceptual || !estado.coherenciaLogica) {
    return {
      accion: "retroceder_capa",
      instruccion: "Retrocede al concepto base necesario y reexplícalo con lenguaje más accesible."
    };
  }

  // 3. Sin transferencia → no avanzar
  if (!estado.transferencia) {
    return {
      accion: "reexplicar",
      instruccion: "Reexplica el concepto aplicándolo a un ejemplo nuevo y concreto antes de avanzar."
    };
  }

  // 4. Alta autonomía y dominio → avanzar y desafiar
  if (
    estado.precisionConceptual &&
    estado.coherenciaLogica &&
    estado.transferencia &&
    estado.autonomia === "alta"
  ) {
    return {
      accion: "avanzar_capa",
      instruccion: "Avanza al siguiente nivel y propone un reto o aplicación más profunda."
    };
  }

  // 5. Caso neutro → mantener capa y reforzar
  return {
    accion: "mantener_capa",
    instruccion: "Refuerza el concepto actual con una breve variación antes de continuar."
  };
}

module.exports = {
  decidirAccionPedagogica
};
