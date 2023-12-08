const express = require("express"); // Importerar Express.js för att skapa server och definera endpoints.
const mysql = require("mysql"); // Importerar MySQL för att interagera med databasen.
const jwt = require("jsonwebtoken"); // Importerar JSON Web Token för autentisering.
const crypto = require("crypto"); // Importerar Crypto för att skapa hash av lösenord.

const app = express();
const PORT = 3000;

// Skapa en anslutning till MySQL-databasen

const con = mysql.createConnection({
  host: "localhost", // Anger databasvärden
  user: "root",
  password: "",
  database: "jensen2023", // Namnet på min databas
  multipleStatements: true, // Tillåter flera SQL-satser i en förfrågan
});

// Lyssna på angiven port och logga när servern är igång
app.listen(PORT, () => {
  console.log(`Servern körs på port ${PORT}`);
});

// En enkel route för att skicka index.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});


app.use(express.json());

// Funktion för att skapa en hash av lösenord
function hash(data) {
  const hashedData = crypto.createHash("sha256").update(data).digest("hex");
  return hashedData;
}

// Funktion för att skapa en JWT-token
function generateToken({ userId, name, email }) {
  return jwt.sign({ userId, name, email }, "EnHemlighetSomIngenKanGissaXyz123%&/", {
    expiresIn: "2h",
  });
}

// Middleware för att validera tokens
function validateToken(req, res, next) {
  let authHeader = req.headers["authorization"];
  if (authHeader === undefined) {
    res.sendStatus(400); // "Bad request"
    return;
  }
  let token = authHeader.slice(7); // Tar bort "BEARER " från headern.

  // Avkodar token
  let decoded;
  try {
    decoded = jwt.verify(token, "EnHemlighetSomIngenKanGissaXyz123%&/");
    console.log(decoded); 
    console.log(`Tjena ${decoded.name}! Din mailadress är ${decoded.email}.`); 
  } catch (err) {
    console.log(err);
    res.status(401).send("Invalid auth token"); // Om token är ogiltig skicka ""
    return;
  }

  req.user = decoded;
  next();
}

//  En endpoint för att hämta alla användare (skyddad med tokenvalidering)
app.get("/users", validateToken, (req, res) => {
  let sql = "SELECT * FROM users";
  con.query(sql, (err, result, fields) => {
    res.send(result);
  });
});

// En endpoint för att hämta en specifik användare baserat på ID
app.get("/users/:id", (req, res) => {
  let sql = `SELECT * FROM users WHERE id=${req.params.id}`;
  con.query(sql, (err, result, fields) => {
    if (result.length > 0) {
      res.send(result);
    } else {
      res.sendStatus(404);
    }
  });
});

// En endpoint för att skapa en ny användare
app.post("/users", (req, res) => {
  let { username, password, name, email } = req.body;
  let hashedPassword = hash(password);

  let sql = `INSERT INTO users (username, password, name, email)
             VALUES ('${username}', '${hashedPassword}', '${name}', '${email}')`;

  con.query(sql, (err, result, fields) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.status(201).json({ id: result.insertId, username, name, email });
  });
});

//  En endpoint för att uppdatera en användares information (skyddad med tokenvalidering)
app.put("/users/:id", validateToken, (req, res) => {
  let { username, password, name, email } = req.body;
  let hashedPassword = hash(password);

  let sql = `UPDATE users 
             SET username='${username}', password='${hashedPassword}', name='${name}', email='${email}'
             WHERE id=${req.params.id}`;

  con.query(sql, (err, result, fields) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    let updatedUser = { id: req.params.id, username, name, email };
    res.json(updatedUser);
  });
});

// En endpoint för att logga in och generera en JWT-token
app.post("/login", (req, res) => {
  let { username, password } = req.body;
  let sql = `SELECT * FROM users WHERE username='${username}'`;

  con.query(sql, (err, result, fields) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (result.length === 0 || result[0].password !== hash(password)) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    let user = {
      id: result[0].id,
      username: result[0].username,
      name: result[0].name,
      email: result[0].email,
    };

    console.log("user object:", user); 

    let token = generateToken({ userId: user.id, name: user.name, email: user.email }); // Genererar en token för användaren

    res.json({ message: `Välkommen, ${user.name}!`, token }); // Skickar välkomstmeddelande och JWT-token som JSON till klienten
  });
});
