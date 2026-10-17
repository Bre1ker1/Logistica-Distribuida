import { Router } from 'express';
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

export default router;