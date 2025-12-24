const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function resolveVoiceProfile(pedagogicState = {}) {
  const {
    nivel = "medio",
    confusion = false,
    progreso = "normal",
  } = pedagogicState;

  if (confusion || nivel === "bajo") {
    return {
      voice: "alloy",
      speed: 0.8,
      style: "explicativo",
    };
  }

  if (nivel === "alto" && progreso === "rapido") {
    return {
      voice: "alloy",
      speed: 1.15,
      style: "directo",
    };
  }

  return {
    voice: "alloy",
    speed: 1.0,
    style: "guiado",
  };
}

async function textToSpeech(text, pedagogicState = {}) {
  if (!text) {
    throw new Error("Texto vacío para TTS");
  }

  const voiceProfile = resolveVoiceProfile(pedagogicState);

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: voiceProfile.voice,
    input: text,
    speed: voiceProfile.speed,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const audioBase64 = buffer.toString("base64");

  return {
    audioBase64,
    voiceProfile,
  };
}

module.exports = {
  textToSpeech,
};
