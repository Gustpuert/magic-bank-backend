const { runTutor } = require("../../services/tutor.service");

async function runAula({ message, profile, course_id }) {
  return await runTutor({
    message,
    profile,
    course_id
  });
}

module.exports = {
  runAula
};
