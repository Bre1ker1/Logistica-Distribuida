
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Registro y autenticación de usuarios
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Registrar un usuario
 *     description: Registra un usuario nuevo con rol CLIENTE. El rol no puede elegirse desde la solicitud.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: cliente@ejemplo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MiClaveSegura123
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Faltan datos obligatorios
 *       409:
 *         description: El usuario ya existe
 *       500:
 *         description: Error interno del servidor
 */

// Registro público: todos los usuarios nuevos son CLIENTE.
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son requeridos'
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error: 'El usuario ya existe'
      });
    }

    const saltRounds = Number.parseInt(
      process.env.BCRYPT_ROUNDS || '10',
      10
    );

    if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
      return res.status(500).json({
        error: 'Configuración de seguridad inválida'
      });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      email,
      passwordHash,
      role: 'CLIENTE'
    });

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('[Auth] Error en registro:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'El usuario ya existe'
      });
    }

    return res.status(500).json({
      error: 'Error interno en el servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Iniciar sesión
 *     description: Comprueba las credenciales y devuelve un JWT firmado con HS256.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: cliente@ejemplo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MiClaveSegura123
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *       400:
 *         description: Faltan datos obligatorios
 *       401:
 *         description: Credenciales inválidas
 *       403:
 *         description: Cuenta deshabilitada
 *       500:
 *         description: Error interno o de configuración
 */

// Login y emisión del JWT.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña requeridos'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    if (!user.activo) {
      return res.status(403).json({
        error: 'La cuenta se encuentra deshabilitada'
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('[Auth] JWT_SECRET no está configurado');

      return res.status(500).json({
        error: 'Error de configuración del servidor'
      });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role
      },
      secret,
      {
        algorithm: 'HS256',
        expiresIn
      }
    );

    return res.status(200).json({
      message: 'Autenticación exitosa',
      token,
      expiresIn
    });

  } catch (error) {
    console.error('[Auth] Error procesando login:', error);

    return res.status(500).json({
      error: 'Error interno al procesar el login'
    });
  }
});

export default router;
