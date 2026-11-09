import express from 'express';
import jwt from 'jsonwebtoken';
import Tracking from '../models/TrackingEvent.js';

const router = express.Router();

const verifyTokenAndRole = (allowedRoles) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acceso denegado. Token no provisto o formato inválido' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({ error: 'Error del servidor: JWT_SECRET no definido en las variables de entorno' });
    }

    try {
      const decoded = jwt.verify(token, secret);

      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: `Acceso prohibido. Rol '${decoded.role}' no autorizado` });
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token vencido' });
      }
      return res.status(401).json({ error: 'Token inválido o firma no autorizada' });
    }
  };
};

// POST: Registrar evento
router.post('/events', verifyTokenAndRole(['OPERADOR', 'ADMIN', 'CLIENTE']), async (req, res) => {
  try {
    const { shipmentId, estado, ubicacion, guia, status, location } = req.body;

    const guiaFinal = guia || shipmentId;
    const statusFinal = status || estado;
    const locationFinal = location || ubicacion || 'Centro de Distribución Principal';

    if (!guiaFinal || !statusFinal) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: guia (o shipmentId) y status (o estado)' });
    }

    const nuevoEvento = new Tracking({
      guia: guiaFinal,
      status: statusFinal,
      location: locationFinal,
      registradoPor: req.user?.email || req.user?.sub || 'Sistema',
      timestamp: new Date()
    });

    await nuevoEvento.save();

    res.status(201).json({
      message: 'Evento de seguimiento registrado y persistido exitosamente',
      evento: nuevoEvento
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el evento en MongoDB: ' + error.message });
  }
});

// GET: Consultar historial de eventos por guía / shipmentId
router.get('/events/:guia', verifyTokenAndRole(['OPERADOR', 'ADMIN', 'CLIENTE']), async (req, res) => {
  try {
    const { guia } = req.params;

    const eventos = await Tracking.find({ guia: guia }).sort({ timestamp: -1 });

    if (!eventos || eventos.length === 0) {
      return res.status(404).json({ error: `No se encontraron eventos para la guía '${guia}'` });
    }

    res.status(200).json({
      guia: guia,
      totalEventos: eventos.length,
      eventos: eventos
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar MongoDB: ' + error.message });
  }
});

export default router;