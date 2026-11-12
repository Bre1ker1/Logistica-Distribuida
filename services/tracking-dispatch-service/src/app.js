
import crypto from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = crypto;

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import setupSwagger from './config/swagger.js';
import trackingRoutes from './routes/tracking.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

// Documentación Swagger
setupSwagger(app);

// Endpoint de salud
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  return res.status(dbConnected ? 200 : 503).json({
    service: 'tracking-dispatch-service',
    status: dbConnected ? 'ok' : 'unavailable',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Rutas de Tracking
app.use('/api/tracking', trackingRoutes);

// Iniciar servidor después de conectar MongoDB
async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no está configurada');
    }

    await mongoose.connect(MONGO_URI);

    console.log('[Tracking] Conectado a MongoDB');

    app.listen(PORT, () => {
      console.log(`[Tracking] Servidor escuchando en puerto ${PORT}`);
    });

  } catch (error) {
    console.error('[Tracking] Error al iniciar el servicio:', error);
    process.exit(1);
  }
}

startServer();
