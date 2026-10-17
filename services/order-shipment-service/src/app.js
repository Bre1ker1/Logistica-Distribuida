import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import shipmentRoutes from './routes/shipment.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Endpoint de Salud (Requisito Obligatorio TP6)
app.get('/health', (req, res) => {
  res.status(200).json({ service: 'order-shipment-service', status: 'ok' });
});

// Documentación Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas del servicio
app.use('/api', shipmentRoutes);

app.listen(PORT, () => {
  console.log(`[Order & Shipment Service] Corriendo en puerto ${PORT}`);
  console.log(`Swagger docs disponibles en http://localhost:${PORT}/api-docs`);
});