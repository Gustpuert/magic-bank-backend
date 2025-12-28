const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const USERS_PATH = path.join(__dirname, "users.json");
const REVOKED_PATH = path.join(__dirname, "revoked_tokens.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_PATH, "utf8"));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function readRevokedTokens() {
  return JSON.parse(fs.readFileSync(REVOKED_PATH, "utf8"));
}

function revokeToken(token) {
  const revoked = readRevokedTokens();
  revoked.push({ token, revokedAt: new Date().toISOString() });
  fs.writeFileSync(REVOKED_PATH, JSON.stringify(revoked, null, 2));
}

function isTokenRevoked(token) {
  const revoked = readRevokedTokens();
  return revoked.some(r => r.token === token);
}

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "24h" // 🔐 EXPIRACIÓN REAL
  });
}

module.exports = {
  readUsers,
  writeUsers,
  generateToken,
  revokeToken,
  isTokenRevoked
};
