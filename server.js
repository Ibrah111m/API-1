const express = require("express");
const mysql = require("mysql");
const jwt = require("jsonwebtoken"); 

const app = express();
const PORT = 3000;

const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "jensen2023",
  multipleStatements: true,
});

app.listen(PORT, () => {
  console.log(`Servern körs på port ${PORT}`);
});

app.use(express.json());

// Funktion för att skapa en JWT-token
function generateToken(userId) {
  return jwt.sign({ userId }, 'your_secret_key', { expiresIn: '2h' });
}

// 
app.get("/users", (req, res) => {
  let sql = "SELECT * FROM users";
  con.query(sql, (err, result, fields) => {
    res.send(result);
  });
});

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

app.post("/users", (req, res) => {
  let { username, password, name, email } = req.body;
  let hashedPassword = hash(password); // hash funktion för att hasha lösenordet

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

// 
app.put("/users/:id", (req, res) => {
  let { username, password, name, email } = req.body;
  let hashedPassword = hash(password); // hash funktion för att hasha lösenordet

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

app.post("/login", (req, res) => {
  let { username, password } = req.body;
  let sql = `SELECT * FROM users WHERE username='${username}'`;

  con.query(sql, (err, result, fields) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (result.length === 0 || result[0].password !== hash(password)) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Inloggning lyckades
    let user = { id: result[0].id, username: result[0].username, name: result[0].name, email: result[0].email };
    let token = generateToken(user.id);

    res.json({ user, token });
  });
});

// för att validera tokens
function validateToken(req, res, next) {
  let token = req.header('Authorization');

  if (!token) {
    res.status(401).json({ error: 'Token missing' });
    return;
  }

  jwt.verify(token, 'your_secret_key', (err, decoded) => {
    if (err) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = decoded;
    next();
  });
}

// la till för att validera tokens på relevanta routes
app.use(validateToken);

  
 
  
  