/**
 * Extrae el veredicto institucional desde la respuesta del tutor
 */

function extraerVeredicto(texto) {
  if (!texto) return null;

  const match = texto.match(
    /\[VEREDICTO\][\s\S]*?RESULTADO:\s*(APROBADO|NO_APROBADO)[\s\S]*?\[\/VEREDICTO\]/i
  );

  if (!match) return null;

  return match[1].toUpperCase();
}

module.exports = {
  extraerVeredicto,
};
