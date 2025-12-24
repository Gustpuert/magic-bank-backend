function evaluar({ message, profile, tutorText }) {
  const nivel = profile?.nivel || "medio";

  const confusion =
    message.length < 10 ||
    /no entiendo|confuso|otra vez/i.test(message);

  let progreso = "normal";

  if (nivel === "alto" && message.length > 40) {
    progreso = "rapido";
  }

  return {
    nivel,
    confusion,
    progreso,
  };
}

module.exports = {
  evaluar,
};
