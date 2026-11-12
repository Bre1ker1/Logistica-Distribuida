
import { Router } from 'express';

import Coverage from '../models/Coverage.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Coverage
 *     description: Validación de cobertura logística
 */

/**
 * @swagger
 * /api/logistics/coverage/validate:
 *   get:
 *     tags: [Coverage]
 *     summary: Validar cobertura por código postal
 *     description: Comprueba si existe cobertura activa para un código postal. Requiere autenticación JWT.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cp
 *         required: true
 *         description: Código postal de destino de cuatro dígitos
 *         schema:
 *           type: string
 *           example: "5500"
 *     responses:
 *       200:
 *         description: Consulta realizada. Indica si la zona tiene cobertura.
 *       400:
 *         description: Código postal requerido
 *       401:
 *         description: Token ausente, inválido o vencido
 *       500:
 *         description: Error interno del servicio
 */

router.get(
  '/logistics/coverage/validate',
  verifyToken,
  async (req, res) => {
    try {
      const { cp } = req.query;

      if (!cp) {
        return res.status(400).json({
          error: 'Código postal requerido'
        });
      }

      // Buscar el código postal en MongoDB.
      const coverage = await Coverage.findOne({
        cp: String(cp).trim(),
        active: true
      });

      if (!coverage) {
        return res.status(200).json({
          cp,
          valid: false,
          hubId: null,
          message: 'Zona sin cobertura'
        });
      }

      return res.status(200).json({
        cp: coverage.cp,
        valid: true,
        hubId: coverage.hubId,
        zoneName: coverage.zoneName,
        message: 'Zona con cobertura activa'
      });

    } catch (error) {
      console.error('[Coverage Error]', error);

      return res.status(500).json({
        error: 'Error interno en cobertura logística'
      });
    }
  }
);

export default router;
