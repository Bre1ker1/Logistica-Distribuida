import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.routes.js';
import setupSwagger from './config/swagger.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Swagger
setupSwagger(app);

// Conexión Mongo
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo-auth:27017/DB_Auth';
mongoose.connect(MONGO_URI)
  .then(() => console.log('[auth-service] Conectado a MongoDB'))
  .catch((err) => console.error('[auth-service] Error Mongo:', err));

// Rutas públicas de Autenticación
app.use('/api/auth', authRoutes);

app.listen(PORT, () => console.log(`[auth-service] Escuchando en puerto ${PORT}`));