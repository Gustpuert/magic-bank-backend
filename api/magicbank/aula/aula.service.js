const fs = require("fs");
const path = require("path");

let OpenAI;
try {
  OpenAI = require("openai");
} catch (e) {
  console.error("OpenAI module no disponible");
}

let openai = null;
if (OpenAI && process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

async function processAulaMessage({ course_id, message, profile }) {
  if (!course_id || !message) {
    throw new Error("Datos incompletos");
  }

  const promptPath = path.join(
    __dirname,
    "..",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(promptPath)) {
    throw new Error("System prompt no encontrado");
  }

  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  if (!openai) {
    throw new Error("OpenAI no inicializado");
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ]
  });

  return {
    tutor: course_id,
    response: completion.choices[0].message.content
  };
}

module.exports = { processAulaMessage };
