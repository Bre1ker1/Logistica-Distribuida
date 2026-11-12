
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import setupSwagger from './config/swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

// Endpoint de salud
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  return res.status(dbConnected ? 200 : 503).json({
    service: 'auth-service',
    status: dbConnected ? 'ok' : 'unavailable',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Documentación Swagger
setupSwagger(app);

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Iniciar servidor después de conectar MongoDB
async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no está configurada');
    }

    await mongoose.connect(MONGO_URI);

    console.log('[Auth] Conectado a MongoDB');

    app.listen(PORT, () => {
      console.log(`[Auth] Servidor escuchando en puerto ${PORT}`);
    });

  } catch (error) {
    console.error('[Auth] Error al iniciar el servicio:', error);
    process.exit(1);
  }
}

startServer();
