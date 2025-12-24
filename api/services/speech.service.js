const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function speechToText(audioBase64) {
  if (!audioBase64) {
    throw new Error("Audio vacío");
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");

  const response = await openai.audio.transcriptions.create({
    file: audioBuffer,
    model: "gpt-4o-transcribe",
  });

  if (!response.text) {
    throw new Error("No se pudo transcribir el audio");
  }

  return response.text;
}

module.exports = {
  speechToText,
};
