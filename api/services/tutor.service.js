/**
 * Tutor Service - MagicBank
 * Responsable de ejecutar el tutor REAL con OpenAI
 * Usa system_prompt.txt como fuente de comportamiento
 */

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function runTutor({ systemPrompt, message, profile }) {
  if (!systemPrompt) {
    throw new Error("System prompt no recibido en runTutor");
  }

  const name = profile?.preferred_name || "Estudiante";

  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "system",
      content: `Nombre del estudiante: ${name}`
    },
    {
      role: "user",
      content: message
    }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    temperature: 0.3
  });

  const text = completion.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenAI no devolvió texto");
  }

  return {
    text
  };
}

module.exports = {
  runTutor
};
