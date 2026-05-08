import 'dotenv/config'; // Updated at 2026-05-06T17:25
import app from './src/app.js';

import db from './src/config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    const connected = await db.testConnection();
    if (connected) {
      await db.syncModels();
      console.log('✅ Database connected and synced');
    }
  } catch (err) {
    console.error('❌ Database connection background error:', err.message);
  }
};

// Start DB in background - don't await so Vercel can boot the app immediately
startServer();

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Local PharmaCare API running on port ${PORT}`);
  });
}

export default app;