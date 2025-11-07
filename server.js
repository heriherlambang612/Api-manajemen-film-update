require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3200;
const { dbMovies, dbDirectors } = require("./database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());

// ---------- ROUTE DIRECTORS ----------
app.get("/directors", (req, res) => {
  const sql = "SELECT * FROM directors ORDER BY id ASC";
  dbDirectors.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/directors/:id", (req, res) => {
  const sql = "SELECT * FROM directors WHERE id = ?";
  const id = Number(req.params.id);
  dbDirectors.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) res.json(row);
    else res.status(404).json({ error: "Sutradara tidak ditemukan" });
  });
});

app.post("/directors", (req, res) => {
  const { name, birthYear } = req.body;
  if (!name || !birthYear)
    return res.status(400).json({ error: "name dan birthYear wajib diisi" });

  const sql = "INSERT INTO directors (name, birthYear) VALUES (?,?)";
  dbDirectors.run(sql, [name, birthYear], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, birthYear });
  });
});

app.put("/directors/:id", (req, res) => {
  const { name, birthYear } = req.body;
  const id = Number(req.params.id);
  if (!name || !birthYear)
    return res.status(400).json({ error: "name dan birthYear wajib diisi" });

  const sql = "UPDATE directors SET name = ?, birthYear = ? WHERE id = ?";
  dbDirectors.run(sql, [name, birthYear, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Sutradara tidak ditemukan" });
    res.json({ id, name, birthYear });
  });
});

app.delete("/directors/:id", (req, res) => {
  const sql = "DELETE FROM directors WHERE id = ?";
  const id = Number(req.params.id);
  dbDirectors.run(sql, id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Sutradara tidak ditemukan" });
    res.status(204).send();
  });
});

// ---------- ROUTE MOVIES ----------
app.get("/movies", (req, res) => {
  const sql = "SELECT * FROM movies ORDER BY id ASC";
  dbMovies.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/movies/:id", (req, res) => {
  const sql = "SELECT * FROM movies WHERE id = ?";
  const id = Number(req.params.id);
  dbMovies.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) res.json(row);
    else res.status(404).json({ error: "Film tidak ditemukan" });
  });
});

app.post("/movies", (req, res) => {
  const { title, director, year } = req.body;
  if (!title || !director || !year)
    return res
      .status(400)
      .json({ error: "title, director, dan year wajib diisi" });

  const sql = "INSERT INTO movies (title, director, year) VALUES (?,?,?)";
  dbMovies.run(sql, [title, director, year], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, title, director, year });
  });
});

app.put("/movies/:id", (req, res) => {
  const { title, director, year } = req.body;
  const id = Number(req.params.id);
  if (!title || !director || !year)
    return res
      .status(400)
      .json({ error: "title, director, dan year wajib diisi" });

  const sql =
    "UPDATE movies SET title = ?, director = ?, year = ? WHERE id = ?";
  dbMovies.run(sql, [title, director, year, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Film tidak ditemukan" });
    res.json({ id, title, director, year });
  });
});

app.delete("/movies/:id", (req, res) => {
  const sql = "DELETE FROM movies WHERE id = ?";
  const id = Number(req.params.id);
  dbMovies.run(sql, id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Film tidak ditemukan" });
    res.status(204).send();
  });
});

// ---------- AUTH ----------
app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6)
    return res
      .status(400)
      .json({ error: "Username dan password (min 6 char) harus diisi" });

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err)
      return res.status(500).json({ error: "Gagal memproses pendaftaran" });

    const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    dbMovies.run(sql, [username.toLowerCase(), hashedPassword], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE"))
          return res.status(409).json({ error: "Username sudah digunakan" });
        return res.status(500).json({ error: "Gagal menyimpan pengguna" });
      }
      res
        .status(201)
        .json({ message: "Registrasi berhasil", userId: this.lastID });
    });
  });
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username dan password harus diisi" });

  const sql = "SELECT * FROM users WHERE username = ?";
  dbMovies.get(sql, [username.toLowerCase()], (err, user) => {
    if (err || !user)
      return res.status(401).json({ error: "Kredensial tidak valid" });

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch)
        return res.status(401).json({ error: "Kredensial tidak valid" });

      const payload = { id: user.id, username: user.username };
      jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
        if (err) return res.status(500).json({ error: "Gagal membuat token" });
        res.json({ message: "Login berhasil", token });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
