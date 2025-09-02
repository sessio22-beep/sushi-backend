const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Tutti gli ordini
app.get('/orders', async (req, res) => {
  const result = await pool.query('SELECT * FROM orders ORDER BY id ASC');
  res.json(result.rows);
});

// Nuovo ordine
app.post('/orders', async (req, res) => {
  const { items, customer } = req.body;
  const result = await pool.query(
    'INSERT INTO orders (items, customer, status) VALUES ($1, $2, $3) RETURNING *',
    [JSON.stringify(items), JSON.stringify(customer), 'new']
  );
  const order = result.rows[0];
  io.emit('new-order', order);
  res.status(201).json(order);
});

// Aggiornamento stato
app.put('/orders/:id', async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  const result = await pool.query(
    'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
    [status, id]
  );
  const order = result.rows[0];
  io.emit('order-updated', order);
  res.json(order);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Nuovo client connesso');
  socket.on('disconnect', () => console.log('Client disconnesso'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server avviato su porta ${PORT}`));
