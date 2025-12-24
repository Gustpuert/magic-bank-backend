const tutorService = require("../../services/tutor.service");
const voiceService = require("../../services/voice.service");

async function runAula({ course_id, message, profile }) {
  // 1. Texto del tutor
  const tutorResponse = await tutorService.runTutor({
    context: course_id || "general",
    message,
    profile,
  });

  // 2. Audio del tutor
  const audioBase64 = await voiceService.textToSpeech(tutorResponse.text);

  return {
    text: tutorResponse.text,
    audio_base64: audioBase64,
    metadata: {
      course_id,
      timestamp: Date.now(),
      voice: "alloy",
    },
  };
}

module.exports = {
  runAula,
};
