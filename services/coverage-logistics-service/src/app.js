import express from 'express';
import cors from 'cors';
import coverageRoutes from './routes/coverage.routes.js';
import setupSwagger from './config/swagger.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Inicializar Swagger UI en /api-docs
setupSwagger(app);

app.use('/api', coverageRoutes);

app.listen(PORT, () => {
  console.log(`Coverage Logistics Service corriendo en el puerto ${PORT}`);
});