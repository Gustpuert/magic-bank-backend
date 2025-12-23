const fs = require("fs");
const path = require("path");

async function runTutor({ course_id, message, profile }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no definida");
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
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI HTTP Error:", response.status, errorText);
    throw new Error("Error HTTP desde OpenAI");
  }

  const data = await response.json();

  // 🔑 Extracción segura del texto (forma correcta)
  let outputText = null;

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === "output_text" && block.text) {
            outputText = block.text;
            break;
          }
        }
      }
      if (outputText) break;
    }
  }

  if (!outputText) {
    console.error("Respuesta OpenAI completa:", JSON.stringify(data, null, 2));
    throw new Error("OpenAI no devolvió texto usable");
  }

  return {
    text: outputText
  };
}

module.exports = { runTutor };
