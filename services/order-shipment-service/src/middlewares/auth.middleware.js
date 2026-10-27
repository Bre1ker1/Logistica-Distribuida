import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado. Token no provisto o formato invalido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'secreto_super_seguro_tp7_2026';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    req.token = token; // Guardamos el token en la request para propagarlo en llamadas HTTP internas
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token vencido' });
    }
    return res.status(401).json({ error: 'Token invalido o firma no autorizada' });
  }
};