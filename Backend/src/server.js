import app from './app.js'
import { pool } from './config/db.js';
import { initializeSocket } from './config/socket.js';
import { createServer } from 'http';

const PORT = process.env.PORT || 3000;

// Create HTTP server and initialize Socket.io
const server = createServer(app);
const io = initializeSocket(server);

// Attach io to app so it's available in controllers
app.set('io', io);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
  pool.getConnection()
    .then(connection => {
      console.log('Database connected successfully');
      connection.release();
    })
    .catch(error => {
      console.error('Database connection failed:', error);
    });
  console.log(`Server is running on port ${PORT}`);
});