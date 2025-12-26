const crypto = require("crypto");

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

async function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

module.exports = {
  hashPassword,
  verifyPassword
};
