import { Router } from 'express';
import { validateCoverage } from '../clients/coverageClient.js';

const router = Router();

/**
 * @openapi
 * /api/shipments:
 *   get:
 *     summary: Obtener listado de envíos
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/shipments', (req, res) => {
  res.json({ message: 'Listado de envíos', shipments: [] });
});

/**
 * @openapi
 * /api/shipments:
 *   post:
 *     summary: Crear un nuevo envío con validación de cobertura
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               destinationCp:
 *                 type: string
 *               weight:
 *                 type: number
 *     responses:
 *       201:
 *         description: Envío creado exitosamente
 *       400:
 *         description: Sin cobertura
 *       503:
 *         description: Servicio de cobertura no disponible
 */
router.post('/shipments', async (req, res) => {
  const { destinationCp, weight } = req.body;

  if (!destinationCp || !weight) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos (destinationCp, weight)' });
  }

  const coverageResult = await validateCoverage(destinationCp);

  if (coverageResult.serviceUnavailable) {
    return res.status(503).json({ error: 'Servicio de cobertura no disponible temporalmente' });
  }

  if (!coverageResult.valid) {
    return res.status(400).json({ error: 'El código postal de destino no tiene cobertura activa' });
  }

  const cost = weight * 1500;
  const guia = `LOG-${Math.floor(100000 + Math.random() * 900000)}`;

  res.status(201).json({
    message: 'Envío creado exitosamente',
    shipment: { guia, destinationCp, weight, cost, status: 'CREADO' }
  });
});

export default router;