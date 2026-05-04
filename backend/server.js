import 'dotenv/config'; // Loaded from backend/.env
import app from './src/app.js';

import db from './src/config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const connected = await db.testConnection();
  if (!connected) {
    console.log('Failed to connect to database. Exiting...');
    process.exit(1);
  }
  await db.syncModels();

  const server = app.listen(PORT, () => {
    console.log(`🚀 PharmaCare API running on port ${PORT} in ${process.env.NODE_ENV} mode`);

  });

  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
};

startServer();