const tutorService = require("../../services/tutor.service");

async function runAula({ course_id, message, profile }) {
  const tutorResponse = await tutorService.runTutor({
    context: course_id || "general",
    message,
    profile,
  });

  return {
    text: tutorResponse.text,
    metadata: {
      course_id,
      timestamp: Date.now(),
    },
  };
}

module.exports = {
  runAula,
};
