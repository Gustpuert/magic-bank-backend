const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function runTutor({ course_id, message, profile }) {
  const promptPath = path.join(
    __dirname,
    "..",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  let systemPrompt = "Eres un tutor experto y amable.";

  if (fs.existsSync(promptPath)) {
    systemPrompt = fs.readFileSync(promptPath, "utf-8");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Alumno: ${profile.preferred_name || "Estudiante"}`
    },
    { role: "user", content: message }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.3
  });

  return {
    text: completion.choices[0].message.content
  };
}

module.exports = { runTutor };
