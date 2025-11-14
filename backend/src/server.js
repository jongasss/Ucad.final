const express = require("express");
const cors = require("cors");
const multer = require("multer");
const connection = require("./db_config");
const app = express();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const connectedUsers = {};

io.on("connection", (socket) => {
  console.log(`Socket conectado: ${socket.id}`);

  socket.on("authenticate", (user1) => {
    try {
      const user = JSON.parse(user1);
      const username = user.name;

      connectedUsers[user.name] = {socketId: socket.id, id: user.id, name: user.name};
      socket.username = username;
      socket.userId = user.id;

      io.emit("update-user-list", Object.keys(connectedUsers));
      console.log(
        `Usuário '${username}' autenticado. Usuários online:`,
        Object.keys(connectedUsers)
      );
    } catch (error) {
      console.log(`Autenticação falhou para o socket ${socket.id}`);
      socket.disconnect();
    }
  });

  socket.on("private-message", async ({ recipient, message }) => {
    const recipientSocketId = connectedUsers[recipient].socketId;
    const sender = socket.username;

    const recipientId = connectedUsers[recipient].id;
    const senderId = socket.userId;

    if (recipientSocketId) {
      connection.query(
        "INSERT INTO messages (sender, recipient, message) VALUES (?, ?, ?)",
        [senderId, recipientId, message], (err, results) => {
          const messageData = { sender, message, createdAt: new Date() };
    
          io.to(recipientSocketId).emit("private-message", messageData);
          socket.emit("private-message", messageData);
        }
      );
    }
  });

  socket.on("load-history", async (recipient) => {
    const sender = socket.userId;
    const recipientId = connectedUsers[recipient].id;

    connection.query(
      `SELECT sender, message, created_at FROM messages 
             WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
             ORDER BY created_at ASC`,
      [sender, recipientId, recipientId, sender],
      (err, results) => {
        socket.emit("history", results);
      }
    );
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      delete connectedUsers[socket.username];
      io.emit("update-user-list", Object.keys(connectedUsers));
      console.log(
        `Usuário '${socket.username}' desconectado. Usuários online:`,
        Object.keys(connectedUsers)
      );
    }
    console.log(`Socket desconectado: ${socket.id}`);
  });
});

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 👇 **A CORREÇÃO ESTÁ AQUI**
    // Use path.join para garantir que o caminho seja absoluto e correto
    // Este agora aponta para a pasta "public" na raiz do seu projeto
    cb(null, path.join(__dirname, "public"));
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.trim().replaceAll(" ", "_");
    cb(null, Date.now() + fileName);
  },
});

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
function imageFileFilter(req, file, cb) {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Erro"));
  }
}

const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
});

const port = 3000;

// Login: return user data on success
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const query =
    "SELECT id, name, email FROM users WHERE email = ? AND password = ?";
  connection.query(query, [email, password], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Erro no servidor." });
    }

    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.json({ success: false, message: "Usuário ou senha incorretos" });
    }
  });
});

// Register: return created user id and basic info
app.post("/cadastro", (req, res) => {
  const { name, email, password } = req.body;
  const query = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  connection.query(query, [name, email, password], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Erro ao cadastrar." });
    }
    res.json({
      success: true,
      id: result.insertId,
      user: { id: result.insertId, name, email },
    });
  });
});

// Get all posts with author name (without image data, for feed)
app.get("/posts", (req, res) => {
  const query = `SELECT p.id, p.user_id, p.content, p.created_at, p.updated_at, (p.image_url IS NOT NULL) as has_image, u.name as author FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`;
  connection.query(query, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar posts" });
    res.json(results);
  });
});

// Get single post by id (with image as base64)
app.get("/posts/:id", (req, res) => {
  const postId = req.params.id;
  const query = `SELECT p.id, p.user_id, p.content, p.created_at, p.updated_at, p.image_url, u.id as author_id, u.name as author FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`;
  connection.query(query, [postId], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar post", error: err });
    if (results.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Post não encontrado" });

    const post = results[0];

    res.json(post);
  });
});

// Create a post with optional image
app.post("/posts", upload.single("image"), (req, res) => {
  const { user_id, content } = req.body;
  console.log(req.body);
  
  
  if (!user_id || !content)
    return res
      .status(400)
      .json({ success: false, message: "Dados incompletos" });

  const query =
    "INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)";
  connection.query(
    query,
    [user_id, content, req.file?.filename],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Erro ao criar post" });
      res.json({ success: true, id: result.insertId });
    }
  );
});

// Update a post (only if user is the author)
app.put("/posts/:id", upload.single("image"), (req, res) => {
  const postId = req.params.id;
  const { user_id, content } = req.body;

  if (!user_id || !content)
    return res
      .status(400)
      .json({ success: false, message: "Dados incompletos" });

  // Check if user is the author
  const checkQuery = "SELECT user_id FROM posts WHERE id = ?";
  connection.query(checkQuery, [postId], (err, results) => {
    if (err || results.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Post não encontrado" });

    if (results[0].user_id !== parseInt(user_id)) {
      return res
        .status(403)
        .json({ success: false, message: "Você não pode editar este post" });
    }

    let imageData = null;
    let imageType = null;

    if (req.file) {
      imageData = req.file.buffer;
      imageType = req.file.mimetype;
    }

    // If image uploaded, update with image; otherwise keep old image
    if (req.file) {
      const updateQuery =
        "UPDATE posts SET content = ?, image_url = ? WHERE id = ?";
      connection.query(
        updateQuery,
        [content, req.file?.filename, postId],
        (err, result) => {
          if (err)
            return res
              .status(500)
              .json({ success: false, message: "Erro ao atualizar post" });
          res.json({ success: true, message: "Post atualizado" });
        }
      );
    } else {
      const updateQuery = "UPDATE posts SET content = ? WHERE id = ?";
      connection.query(updateQuery, [content, postId], (err, result) => {
        if (err)
          return res
            .status(500)
            .json({ success: false, message: "Erro ao atualizar post" });
        res.json({ success: true, message: "Post atualizado" });
      });
    }
  });
});

// Delete a post (only if user is the author)
app.delete("/posts/:id", (req, res) => {
  const postId = req.params.id;
  const { user_id } = req.body;

  const checkQuery = "SELECT user_id FROM posts WHERE id = ?";
  connection.query(checkQuery, [postId], (err, results) => {
    if (err || results.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Post não encontrado" });

    if (results[0].user_id !== parseInt(user_id)) {
      return res
        .status(403)
        .json({ success: false, message: "Você não pode deletar este post" });
    }

    const deleteQuery = "DELETE FROM posts WHERE id = ?";
    connection.query(deleteQuery, [postId], (err) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Erro ao deletar post" });
      res.json({ success: true, message: "Post deletado" });
    });
  });
});

// Get comments for a post
app.get("/posts/:id/comments", (req, res) => {
  const postId = req.params.id;
  const query = `SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.name as author FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC`;
  connection.query(query, [postId], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar comentários" });
    res.json(results);
  });
});

// Add comment to post
app.post("/posts/:id/comments", (req, res) => {
  const postId = req.params.id;
  const { user_id, content } = req.body;
  if (!user_id || !content)
    return res
      .status(400)
      .json({ success: false, message: "Dados incompletos" });
  const query =
    "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)";
  connection.query(query, [postId, user_id, content], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao adicionar comentário" });
    res.json({ success: true, id: result.insertId });
  });
});

// Get user by id (with profile picture as base64)
app.get("/users/:id", (req, res) => {
  const id = req.params.id;
  const query =
    "SELECT id, name, email, profile_picture_url FROM users WHERE id = ?";
  connection.query(query, [id], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar usuário" });
    if (results.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado" });

    const user = results[0];

    res.json(user);
  });
});

// Update user profile (with optional profile picture)
app.put("/users/:id", upload.single("profile_picture"), (req, res) => {
  const id = req.params.id;
  const { name, email, password } = req.body;

  if (!name || !email)
    return res
      .status(400)
      .json({ success: false, message: "Nome e email são obrigatórios" });

  // If picture uploaded, update with picture; otherwise keep old picture
  let fields = [];
  let params = [];

  // Campos obrigatórios
  fields.push("name = ?");
  params.push(name);

  fields.push("email = ?");
  params.push(email);

  // Campo opcional: só atualiza se vier do frontend
  if (password) {
    fields.push("password = ?");
    params.push(password);
  }

  // Upload de imagem (opcional)
  if (req.file) {
    fields.push("profile_picture_url = ?");
    params.push(req.file.filename);
  }

  params.push(id);

  const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;

  connection.query(query, params, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao atualizar perfil" });
    res.json({ success: true, message: "Perfil atualizado" });
  });
});

app.use("/uploads/", express.static(path.join(__dirname, "public")));

server.listen(port, () => console.log(`Servidor rodando na porta ${port}`));