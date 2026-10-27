import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/auth-db';
    await mongoose.connect(connStr);
    console.log('[auth-service] MongoDB Conectado');
  } catch (error) {
    console.error('[auth-service] Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};