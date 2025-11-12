const express = require('express');
const cors = require('cors');
const multer = require('multer');
const connection = require('./db_config');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Configure multer for image uploads (in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

const port = 3000;

// Login: return user data on success
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT id, name, email FROM users WHERE email = ? AND password = ?';
  connection.query(query, [email, password], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }

    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.json({ success: false, message: 'Usuário ou senha incorretos' });
    }
  });
});

// Register: return created user id and basic info
app.post('/cadastro', (req, res) => {
  const { name, email, password } = req.body;
  const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  connection.query(query, [name, email, password], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Erro ao cadastrar.' });
    }
    res.json({ success: true, id: result.insertId, user: { id: result.insertId, name, email } });
  });
});

// Get all posts with author name (without image data, for feed)
app.get('/posts', (req, res) => {
  const query = `SELECT p.id, p.user_id, p.content, p.created_at, p.updated_at, (p.image IS NOT NULL) as has_image, u.name as author FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`;
  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar posts' });
    res.json(results);
  });
});

// Get single post by id (with image as base64)
app.get('/posts/:id', (req, res) => {
  const postId = req.params.id;
  const query = `SELECT p.id, p.user_id, p.content, p.created_at, p.updated_at, p.image, p.image_type, u.id as author_id, u.name as author FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`;
  connection.query(query, [postId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar post' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Post não encontrado' });
    
    const post = results[0];
    if (post.image) {
      post.image_url = `data:${post.image_type};base64,${post.image.toString('base64')}`;
    }
    delete post.image; // remove raw buffer from response
    
    res.json(post);
  });
});

// Create a post with optional image
app.post('/posts', upload.single('image'), (req, res) => {
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ success: false, message: 'Dados incompletos' });
  
  let imageData = null;
  let imageType = null;
  
  if (req.file) {
    imageData = req.file.buffer;
    imageType = req.file.mimetype;
  }
  
  const query = 'INSERT INTO posts (user_id, content, image, image_type) VALUES (?, ?, ?, ?)';
  connection.query(query, [user_id, content, imageData, imageType], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao criar post' });
    res.json({ success: true, id: result.insertId });
  });
});

// Update a post (only if user is the author)
app.put('/posts/:id', upload.single('image'), (req, res) => {
  const postId = req.params.id;
  const { user_id, content } = req.body;
  
  if (!user_id || !content) return res.status(400).json({ success: false, message: 'Dados incompletos' });
  
  // Check if user is the author
  const checkQuery = 'SELECT user_id FROM posts WHERE id = ?';
  connection.query(checkQuery, [postId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Post não encontrado' });
    
    if (results[0].user_id !== parseInt(user_id)) {
      return res.status(403).json({ success: false, message: 'Você não pode editar este post' });
    }
    
    let imageData = null;
    let imageType = null;
    
    if (req.file) {
      imageData = req.file.buffer;
      imageType = req.file.mimetype;
    }
    
    // If image uploaded, update with image; otherwise keep old image
    if (req.file) {
      const updateQuery = 'UPDATE posts SET content = ?, image = ?, image_type = ? WHERE id = ?';
      connection.query(updateQuery, [content, imageData, imageType, postId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao atualizar post' });
        res.json({ success: true, message: 'Post atualizado' });
      });
    } else {
      const updateQuery = 'UPDATE posts SET content = ? WHERE id = ?';
      connection.query(updateQuery, [content, postId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao atualizar post' });
        res.json({ success: true, message: 'Post atualizado' });
      });
    }
  });
});

// Delete a post (only if user is the author)
app.delete('/posts/:id', (req, res) => {
  const postId = req.params.id;
  const { user_id } = req.body;
  
  const checkQuery = 'SELECT user_id FROM posts WHERE id = ?';
  connection.query(checkQuery, [postId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Post não encontrado' });
    
    if (results[0].user_id !== parseInt(user_id)) {
      return res.status(403).json({ success: false, message: 'Você não pode deletar este post' });
    }
    
    const deleteQuery = 'DELETE FROM posts WHERE id = ?';
    connection.query(deleteQuery, [postId], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Erro ao deletar post' });
      res.json({ success: true, message: 'Post deletado' });
    });
  });
});

// Get comments for a post
app.get('/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  const query = `SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.name as author FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC`;
  connection.query(query, [postId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar comentários' });
    res.json(results);
  });
});

// Add comment to post
app.post('/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ success: false, message: 'Dados incompletos' });
  const query = 'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)';
  connection.query(query, [postId, user_id, content], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao adicionar comentário' });
    res.json({ success: true, id: result.insertId });
  });
});

// Get user by id (with profile picture as base64)
app.get('/users/:id', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT id, name, email, profile_picture, picture_type FROM users WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    
    const user = results[0];
    if (user.profile_picture) {
      user.picture_url = `data:${user.picture_type};base64,${user.profile_picture.toString('base64')}`;
    }
    delete user.profile_picture;
    
    res.json(user);
  });
});

// Update user profile (with optional profile picture)
app.put('/users/:id', upload.single('profile_picture'), (req, res) => {
  const id = req.params.id;
  const { name, email, password } = req.body;
  
  if (!name || !email) return res.status(400).json({ success: false, message: 'Nome e email são obrigatórios' });
  
  let pictureData = null;
  let pictureType = null;
  
  if (req.file) {
    pictureData = req.file.buffer;
    pictureType = req.file.mimetype;
  }
  
  // If picture uploaded, update with picture; otherwise keep old picture
  let query, params;
  if (req.file) {
    query = 'UPDATE users SET name = ?, email = ?, password = ?, profile_picture = ?, picture_type = ? WHERE id = ?';
    params = [name, email, password || undefined, pictureData, pictureType, id];
  } else {
    query = 'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?';
    params = [name, email, password || undefined, id];
  }
  
  connection.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
    res.json({ success: true, message: 'Perfil atualizado' });
  });
});

// Get user profile picture by id
app.get('/users/:id/picture', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT profile_picture, picture_type FROM users WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    
    const user = results[0];
    if (!user.profile_picture) {
      return res.status(404).json({ success: false, message: 'Sem foto de perfil' });
    }
    
    res.json({ picture_url: `data:${user.picture_type};base64,${user.profile_picture.toString('base64')}` });
  });
});

app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));