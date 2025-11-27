require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3200;

const db = require("./db"); // KONEKSI POSTGRESQL
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());

// ================= DIRECTORS =================

app.get("/directors", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM directors ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/directors/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM directors WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Sutradara tidak ditemukan" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/directors", async (req, res) => {
  const { name, birthYear } = req.body;

  if (!name || !birthYear)
    return res.status(400).json({ error: "name dan birthYear wajib diisi" });

  try {
    const result = await db.query(
      'INSERT INTO directors (name, "birthYear") VALUES ($1, $2) RETURNING *',
      [name, birthYear]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/directors/:id", async (req, res) => {
  const { name, birthYear } = req.body;

  if (!name || !birthYear)
    return res.status(400).json({ error: "name dan birthYear wajib diisi" });

  try {
    const result = await db.query(
      'UPDATE directors SET name=$1, "birthYear"=$2 WHERE id=$3 RETURNING *',
      [name, birthYear, req.params.id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Sutradara tidak ditemukan" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/directors/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM directors WHERE id=$1 RETURNING *",
      [req.params.id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Sutradara tidak ditemukan" });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MOVIES =================

app.get("/movies", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM movies ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/movies/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM movies WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Film tidak ditemukan" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/movies", async (req, res) => {
  const { title, director_id, year } = req.body;

  if (!title || !director_id || !year)
    return res.status(400).json({
      error: "title, director_id, dan year wajib diisi",
    });

  try {
    const result = await db.query(
      "INSERT INTO movies (title, director_id, year) VALUES ($1,$2,$3) RETURNING *",
      [title, director_id, year]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/movies/:id", async (req, res) => {
  const { title, director_id, year } = req.body;

  if (!title || !director_id || !year)
    return res.status(400).json({
      error: "title, director_id, dan year wajib diisi",
    });

  try {
    const result = await db.query(
      "UPDATE movies SET title=$1, director_id=$2, year=$3 WHERE id=$4 RETURNING *",
      [title, director_id, year, req.params.id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Film tidak ditemukan" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/movies/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM movies WHERE id=$1 RETURNING *",
      [req.params.id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Film tidak ditemukan" });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= AUTH =================

app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6)
    return res.status(400).json({
      error: "Username dan password (min 6 char) harus diisi",
    });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      "INSERT INTO users (username, password) VALUES ($1,$2) RETURNING id, username",
      [username.toLowerCase(), hashedPassword]
    );

    res.status(201).json({
      message: "Registrasi berhasil",
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username sudah digunakan" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username.toLowerCase(),
    ]);

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Kredensial tidak valid" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Kredensial tidak valid" });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login berhasil", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= RUN SERVER =================

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
