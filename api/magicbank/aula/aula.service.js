const tutorService = require("../../services/tutor.service");
const voiceService = require("../../services/voice.service");
const reglasDecision = require("../../pedagogia/reglas_decision");

async function runAula({ course_id, message, profile }) {
  // 1. Ejecutar tutor
  const tutorResponse = await tutorService.runTutor({
    context: course_id || "general",
    message,
    profile,
  });

  // 2. Evaluar estado pedagógico
  const pedagogicState = reglasDecision.evaluar({
    message,
    profile,
    tutorText: tutorResponse.text,
  });

  // 3. Generar voz adaptativa
  const voiceResult = await voiceService.textToSpeech(
    tutorResponse.text,
    pedagogicState
  );

  return {
    text: tutorResponse.text,
    audio_base64: voiceResult.audioBase64,
    pedagogia: pedagogicState,
    voz: voiceResult.voiceProfile,
    metadata: {
      course_id,
      timestamp: Date.now(),
    },
  };
}

module.exports = {
  runAula,
};
