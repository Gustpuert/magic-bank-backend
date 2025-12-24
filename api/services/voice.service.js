const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function textToSpeech(text) {
  if (!text) {
    throw new Error("Texto vacío para TTS");
  }

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  // Convertir a base64 para frontend HTML simple
  const buffer = Buffer.from(await response.arrayBuffer());
  const audioBase64 = buffer.toString("base64");

  return audioBase64;
}

module.exports = {
  textToSpeech,
};
