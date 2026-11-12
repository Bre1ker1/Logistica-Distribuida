
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';

import coverageRoutes from './routes/coverage.routes.js';
import setupSwagger from './config/swagger.js';

const app = express();
const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

// Endpoint de salud: verifica también la conexión con MongoDB.
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  return res.status(dbConnected ? 200 : 503).json({
    service: 'coverage-logistics-service',
    status: dbConnected ? 'ok' : 'unavailable',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Documentación Swagger.
setupSwagger(app);

// Rutas del servicio.
app.use('/api', coverageRoutes);

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no está configurada');
    }

    await mongoose.connect(MONGO_URI);

    console.log('[Coverage] Conectado a MongoDB');

    app.listen(PORT, () => {
      console.log(`[Coverage] Corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('[Coverage] Error al iniciar el servicio:', error);
    process.exit(1);
  }
}

startServer();
