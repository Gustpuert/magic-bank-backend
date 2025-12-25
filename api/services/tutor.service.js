/**
 * Tutor Service - MagicBank
 * Conecta tutores reales (ej: ElChef) vía OpenAI API
 * CommonJS compatible con Railway
 */

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

/* =========================
   CLIENTE OPENAI
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   RUN TUTOR (REAL)
========================= */
async function runTutor({ message, profile, course_id }) {

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no definida en el entorno");
  }

  if (!course_id) {
    throw new Error("course_id es obligatorio");
  }

  /* =========================
     CARGA SYSTEM PROMPT REAL
  ========================= */
  const promptPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(promptPath)) {
    throw new Error(`system_prompt.txt no encontrado para ${course_id}`);
  }

  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  const alumno = profile?.preferred_name || "Alumno";

  /* =========================
     MENSAJES AL MODELO
  ========================= */
  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "system",
      content: `Alumno: ${alumno}`
    },
    {
      role: "user",
      content: message
    }
  ];

  /* =========================
     LLAMADA A OPENAI
  ========================= */
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages,
    temperature: 0.3
  });

  const text = completion.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenAI no devolvió contenido del tutor");
  }

  /* =========================
     RESPUESTA LIMPIA
  ========================= */
  return {
    text
  };
}

module.exports = {
  runTutor
};
