import { Router } from 'express';
import Coverage from '../models/Coverage.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/logistics/coverage/validate', verifyToken, async (req, res) => {
  try {
    const { cp } = req.query;
    if (!cp) return res.status(400).json({ error: 'Codigo postal requerido' });

    const isCoverageValid = cp.startsWith('5') || cp === '5500';

    res.json({
      cp,
      valid: isCoverageValid,
      hubId: isCoverageValid ? 'HUB-MZA-01' : null,
      message: isCoverageValid ? 'Zona con cobertura activa' : 'Sin cobertura en la zona',
      requestedBy: req.user.email
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno en servicio de cobertura' });
  }
});

export default router;