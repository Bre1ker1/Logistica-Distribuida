import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

connectDB();

app.get('/health', (req, res) => res.json({ status: 'OK', service: 'auth-service' }));
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`[auth-service] Escuchando en puerto ${PORT}`);
});