
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
    console.error('[Coverage Auth] JWT_SECRET no configurado');

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
