const fs = require("fs");
const path = require("path");

const usersPath = path.join(process.cwd(), "api", "data", "users.json");

function getUserById(userId) {
  const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
  return users.find(u => u.id === userId);
}

function getValidAccess(userId) {
  const user = getUserById(userId);
  if (!user) return [];

  const now = Date.now();

  return user.access
    .filter(a => new Date(a.expires_at).getTime() > now)
    .map(a => a.code);
}

module.exports = {
  getValidAccess
};
