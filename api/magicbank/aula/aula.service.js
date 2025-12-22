const fs = require("fs");
const path = require("path");

async function runTutor({ course_id, message, profile }) {
  const promptPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(promptPath)) {
    throw new Error("System prompt no encontrado");
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
          content: `Alumno: ${profile?.preferred_name || "Alumno"}`
        },
        {
          role: "user",
          content: message
        }
      ]
    })
  });

  const data = await response.json();

  // 🔑 Extracción correcta del texto
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
