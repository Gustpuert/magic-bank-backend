const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    throw new Error(`System prompt no encontrado para el curso: ${course_id}`);
  }

  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Alumno: ${profile.preferred_name}`
    },
    { role: "user", content: message }
  ];

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: messages,
    max_output_tokens: 500
  });

  return {
    text: response.output_text
  };
}

module.exports = { runTutor };
