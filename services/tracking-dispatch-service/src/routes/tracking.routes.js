import { Router } from 'express';
import TrackingEvent from '../models/TrackingEvent.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Consulta de trazabilidad: Requiere estar autenticado (USER, OPERADOR, ADMIN)
router.get('/tracking/:guia', verifyToken, async (req, res) => {
  try {
    const events = await TrackingEvent.find({ guia: req.params.guia }).sort({ timestamp: 1 });
    if (!events || events.length === 0) {
      return res.status(404).json({ message: 'No se encontraron eventos para la guia especificada' });
    }
    res.json({ guia: req.params.guia, historial: events });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar la trazabilidad' });
  }
});

// Registro de eventos de despacho: Restringido únicamente a ADMIN u OPERADOR
router.post('/tracking/events', verifyToken, checkRole(['ADMIN', 'OPERADOR']), async (req, res) => {
  try {
    const { guia, estado, ubicacion, observaciones } = req.body;

    if (!guia || !estado || !ubicacion) {
      return res.status(400).json({ error: 'Guia, estado y ubicacion son obligatorios' });
    }

    const newEvent = await TrackingEvent.create({
      guia,
      estado,
      ubicacion,
      observaciones,
      registradoPor: req.user.email
    });

    res.status(201).json({
      message: 'Evento de trazabilidad registrado con exito',
      evento: newEvent
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el evento de trazabilidad' });
  }
});

export default router;