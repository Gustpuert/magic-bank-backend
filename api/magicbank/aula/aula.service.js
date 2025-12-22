const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function processAulaMessage({ course_id, message, profile }) {
  if (!course_id || !message) {
    throw new Error("Datos incompletos");
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

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Alumno: ${profile?.preferred_name || "Alumno"}`
    },
    { role: "user", content: message }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.3
  });

  return {
    tutor: course_id,
    response: completion.choices[0].message.content
  };
}

module.exports = { processAulaMessage };
