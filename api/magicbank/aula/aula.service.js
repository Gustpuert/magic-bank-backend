const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function runTutor({ course_id, message, profile }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const promptPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(promptPath)) {
    throw new Error(`System prompt no encontrado para el curso: ${course_id}`);
  }

  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "system",
        content: `Alumno: ${profile?.preferred_name || "Alumno"}`
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  const text = completion?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenAI no devolvió contenido");
  }

  return { text };
}

module.exports = { runTutor };
