import { Router } from 'express';
import TrackingEvent from '../models/TrackingEvent.js';

const router = Router();

/**
 * @openapi
 * /api/tracking/{guia}:
 *   get:
 *     summary: Obtener el historial de trazabilidad de un paquete
 *     parameters:
 *       - in: path
 *         name: guia
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historial de eventos obtenido exitosamente
 */
router.get('/tracking/:guia', async (req, res) => {
  try {
    const { guia } = req.params;
    
    const events = [
      { status: 'REGISTRADO', location: 'Centro de Recepción MZA', timestamp: new Date() },
      { status: 'EN_TRANSITO', location: 'Hub Principal MZA-01', timestamp: new Date() }
    ];

    res.json({ guia, events });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar el historial de tracking' });
  }
});

/**
 * @openapi
 * /api/tracking/events:
 *   post:
 *     summary: Registrar un nuevo evento de escaneo/despacho
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guia:
 *                 type: string
 *               status:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Evento registrado exitosamente
 */
router.post('/tracking/events', async (req, res) => {
  const { guia, status, location } = req.body;

  if (!guia || !status || !location) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos (guia, status, location)' });
  }

  res.status(201).json({
    message: 'Evento de escaneo registrado exitosamente',
    event: { guia, status, location, timestamp: new Date() }
  });
});

export default router;