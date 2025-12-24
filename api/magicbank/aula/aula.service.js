const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function runTutor({ course_id, message, profile }) {
  // 1. Verificación clave
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está definida");
  }

  // 2. Path del system prompt del tutor
  const tutorPromptPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(tutorPromptPath)) {
    throw new Error(`System prompt no encontrado para el curso: ${course_id}`);
  }

  const tutorSystemPrompt = fs.readFileSync(tutorPromptPath, "utf-8");

  // 3. Path de la Constitución Pedagógica MagicBank
  const pedagogiaPath = path.join(
    process.cwd(),
    "pedagogia",
    "constitucion_magicbank.txt"
  );

  if (!fs.existsSync(pedagogiaPath)) {
    throw new Error("Constitución MagicBank no encontrada");
  }

  const pedagogiaRules = fs.readFileSync(pedagogiaPath, "utf-8");

  // 4. Construcción del contexto del alumno
  const studentContext = `Alumno: ${profile?.preferred_name || "Alumno"}`;

  // 5. Llamada oficial a OpenAI
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: tutorSystemPrompt
      },
      {
        role: "system",
        content: pedagogiaRules
      },
      {
        role: "system",
        content: studentContext
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  // 6. Extracción segura del texto
  const output =
    response.output?.[0]?.content?.find(
      item => item.type === "output_text"
    )?.text;

  if (!output) {
    console.error(
      "Respuesta OpenAI inesperada:",
      JSON.stringify(response, null, 2)
    );
    throw new Error("OpenAI no devolvió texto");
  }

  // 7. Respuesta limpia al controlador
  return {
    text: output
  };
}

module.exports = { runTutor };
