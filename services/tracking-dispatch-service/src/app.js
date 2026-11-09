import crypto from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = crypto;

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import setupSwagger from './config/swagger.js';
import trackingRoutes from './routes/tracking.routes.js';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Inicializar Swagger UI
setupSwagger(app);

// Conexión a MongoDB (Database-per-Service)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://tracking-db:27017/DB_Tracking';
mongoose.connect(MONGO_URI)
  .then(() => console.log('[tracking-dispatch-service] Conectado a MongoDB'))
  .catch((err) => console.error('[tracking-dispatch-service] Error conectando a MongoDB:', err));

// Endpoint de salud
app.get('/health', (req, res) => res.json({ status: 'OK', service: 'tracking-dispatch-service' }));

// Rutas de tracking
app.use('/api/tracking', trackingRoutes);

app.listen(PORT, () => {
  console.log(`[tracking-dispatch-service] Corriendo en el puerto ${PORT}`);
});