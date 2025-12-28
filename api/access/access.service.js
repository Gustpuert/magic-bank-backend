const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(
  __dirname,
  "../../data/access/usuarios.json"
);

function loadUsers() {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(users, null, 2));
}

function productToAccess(product) {
  const map = {
    academy: "academy.magicbank.org",
    university: "university.magicbank.org"
  };
  return map[product];
}

async function grantAccess(email, product) {
  const accessDomain = productToAccess(product);
  if (!accessDomain) throw new Error("Producto inválido");

  const users = loadUsers();
  let user = users.find(u => u.email === email);

  if (!user) {
    user = {
      email,
      access: [accessDomain],
      expires: "2027-01-01"
    };
    users.push(user);
  } else if (!user.access.includes(accessDomain)) {
    user.access.push(accessDomain);
  }

  saveUsers(users);
}

module.exports = { grantAccess };
