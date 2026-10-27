import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

// Middleware de verificación de token JWT y control de roles (RBAC)
const verifyTokenAndRole = (allowedRoles) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acceso denegado. Token no provisto o formato invalido' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = process.env.JWT_SECRET || 'secreto_super_seguro_tp7_2026';
      const decoded = jwt.verify(token, secret);
      
      // Control de roles (RBAC)
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: `Acceso prohibido. Rol '${decoded.role}' no autorizado` });
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token vencido' });
      }
      return res.status(401).json({ error: 'Token invalido o firma no autorizada' });
    }
  };
};

// Endpoint protegido por RBAC: Solo OPERADOR y ADMIN pueden registrar eventos de despacho
app.post('/api/tracking/events', verifyTokenAndRole(['OPERADOR', 'ADMIN']), async (req, res) => {
  try {
    const { shipmentId, estado, ubicacion } = req.body;

    if (!shipmentId || !estado) {
      return res.status(400).json({ error: 'shipmentId y estado son obligatorios' });
    }

    res.status(201).json({
      message: 'Evento de seguimiento registrado exitosamente',
      evento: {
        shipmentId,
        estado,
        ubicacion: ubicacion || 'Centro de Distribución Principal',
        registradoPor: req.user.email,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno en servicio de despacho/tracking' });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Tracking Dispatch Service corriendo en el puerto ${PORT}`);
});