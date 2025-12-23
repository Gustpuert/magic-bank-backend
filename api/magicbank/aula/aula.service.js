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

  // 2. Construcción del path del system prompt
  const promptPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  // 3. Verificación de existencia del prompt
  if (!fs.existsSync(promptPath)) {
    throw new Error(`System prompt no encontrado para el curso: ${course_id}`);
  }

  // 4. Lectura del prompt
  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  // 5. Llamada oficial a OpenAI (forma correcta)
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
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
