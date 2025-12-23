const fs = require("fs");
const path = require("path");

async function runTutor({ course_id, message, profile }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está definida");
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

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "system",
          content: `Alumno: ${profile.preferred_name || "Alumno"}`
        },
        {
          role: "user",
          content: message
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${text}`);
  }

  const data = await response.json();

  const output =
    data.output?.[0]?.content?.find(c => c.type === "output_text")?.text;

  if (!output) {
    console.error("Respuesta OpenAI completa:", JSON.stringify(data, null, 2));
    throw new Error("OpenAI no devolvió texto");
  }

  return {
    text: output
  };
}

module.exports = { runTutor };
