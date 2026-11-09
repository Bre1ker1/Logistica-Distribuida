import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

// Registro público (Forzado a CLIENTE)
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      email,
      passwordHash,
      role: 'CLIENTE'
    });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno en el servidor: ' + error.message });
  }
});

// Login y emisión de JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = user.comparePassword 
      ? await user.comparePassword(password)
      : await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const secret = process.env.JWT_SECRET || 'secreto_super_seguro_tp7_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

    const token = jwt.sign(
      { sub: user._id, email: user.email, role: user.role },
      secret,
      { expiresIn }
    );

    res.json({
      message: 'Autenticación exitosa',
      token,
      expiresIn
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al procesar el login: ' + error.message });
  }
});

export default router;