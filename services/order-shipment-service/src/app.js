
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger.js';
import shipmentRoutes from './routes/shipment.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

// Endpoint de salud: comprueba también la conexión con MongoDB.
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  return res.status(dbConnected ? 200 : 503).json({
    service: 'order-shipment-service',
    status: dbConnected ? 'ok' : 'unavailable',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Documentación Swagger UI.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas del servicio.
app.use('/api', shipmentRoutes);

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no está configurada');
    }

    await mongoose.connect(MONGO_URI);

    console.log('[Order Shipment] Conectado a MongoDB');

    app.listen(PORT, () => {
      console.log(`[Order Shipment] Corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('[Order Shipment] Error de conexión:', error);
    process.exit(1);
  }
}

startServer();
