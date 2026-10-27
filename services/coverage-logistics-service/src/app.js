import express from 'express';
import coverageRoutes from './routes/coverage.routes.js';

const app = express();
app.use(express.json());

app.use('/api', coverageRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Coverage Logistics Service corriendo en el puerto ${PORT}`);
});