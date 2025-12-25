/**
 * Tutor Service - MagicBank
 * Usa OpenAI SDK oficial
 * System prompt SIEMPRE invisible
 */

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Ejecuta un tutor específico según course_id
 */
async function runTutor({ message, profile, course_id }) {
  if (!course_id) {
    throw new Error("course_id requerido para ejecutar tutor");
  }

  /* =========================
     RESOLVER SYSTEM PROMPT
  ========================= */

  const tutorPromptPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(tutorPromptPath)) {
    throw new Error(`System prompt no encontrado para tutor ${course_id}`);
  }

  const systemPrompt = fs.readFileSync(tutorPromptPath, "utf-8");

  /* =========================
     LLAMADA A OPENAI
  ========================= */

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  const text = completion.choices[0]?.message?.content;

  if (!text) {
    throw new Error("Respuesta vacía del modelo");
  }

  /* =========================
     RESPUESTA LIMPIA
  ========================= */

  return {
    text,
    tutor: course_id
  };
}

module.exports = {
  runTutor
};
