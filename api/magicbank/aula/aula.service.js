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
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "system",
          content: `Alumno: ${profile.preferred_name}`
        },
        {
          role: "user",
          content: message
        }
      ]
    })
  });

  const data = await response.json();

  if (!data.output_text) {
    throw new Error("Respuesta inválida de OpenAI");
  }

  return {
    text: data.output_text
  };
}

module.exports = { runTutor };
