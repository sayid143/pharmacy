import 'dotenv/config';
import db from './src/config/db.js';

const sync = async () => {
  try {
    await db.testConnection();
    await db.syncModels({ alter: true });
    console.log('Database synchronized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing database:', err);
    process.exit(1);
  }
};

sync();
