
import jwt from 'jsonwebtoken';

// Verifica que el usuario presente un JWT válido firmado con HS256.
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader || '');

  if (!match) {
    return res.status(401).json({
      error: 'Acceso denegado. Se requiere un token Bearer válido'
    });
  }

  const token = match[1].trim();

  if (!token) {
    return res.status(401).json({
      error: 'Token no provisto'
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[Shipment Auth] JWT_SECRET no configurado');

    return res.status(500).json({
      error: 'Configuración de seguridad incompleta'
    });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256']
    });

    req.user = decoded;
    req.token = token;

    return next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token vencido'
      });
    }

    return res.status(401).json({
      error: 'Token inválido o firma no autorizada'
    });
  }
};

// Autoriza el acceso según los roles permitidos.
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tenés permisos para realizar esta operación'
      });
    }

    return next();
  };
};
