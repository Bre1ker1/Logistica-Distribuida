import { Router } from 'express';
import Shipment from '../models/Shipment.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Endpoint de creación de envíos: Protegido y con propagación de token JWT
router.post('/shipments', verifyToken, async (req, res) => {
  try {
    const { origen, destino, cp, peso } = req.body;

    if (!origen || !destino || !cp) {
      return res.status(400).json({ error: 'Origen, destino y codigo postal son obligatorios' });
    }

    // Consulta HTTP a coverage-logistics-service PROPAGANDO EL JWT
    const coverageUrl = process.env.COVERAGE_SERVICE_URL || 'http://localhost:3002';
    
    const coverageResponse = await fetch(`${coverageUrl}/api/logistics/coverage/validate?cp=${cp}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.token}` // PROPAGACIÓN DEL TOKEN JWT
      }
    });

    if (!coverageResponse.ok) {
      const errorData = await coverageResponse.json();
      return res.status(coverageResponse.status).json({
        error: 'Fallo la validacion de cobertura autenticada',
        detalle: errorData
      });
    }

    const coverageData = await coverageResponse.json();

    if (!coverageData.valid) {
      return res.status(400).json({ error: 'La zona especificada no posee cobertura para envíos' });
    }

    // Creación del envío en base de datos
    const newShipment = await Shipment.create({
      origen,
      destino,
      cp,
      peso,
      hubAsignado: coverageData.hubId,
      creadoPor: req.user.email,
      estado: 'CREADO'
    });

    res.status(201).json({
      message: 'Envio registrado exitosamente',
      envio: newShipment
    });

  } catch (error) {
    res.status(500).json({ error: 'Error interno en el servicio de envios' });
  }
});

export default router;