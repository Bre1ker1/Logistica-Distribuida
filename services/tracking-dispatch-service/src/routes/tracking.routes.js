
import express from 'express';
import Tracking from '../models/TrackingEvent.js';

import {
  verifyToken,
  checkRole
} from '../middlewares/auth.middleware.js';

import {
  validateShipment,
  updateShipmentStatus
} from '../clients/shipmentClient.js';

const router = express.Router();

const ESTADOS_PERMITIDOS = ['EN_RUTA', 'ENTREGADO'];

/**
 * @swagger
 * tags:
 *   - name: Tracking
 *     description: Registro y consulta de eventos de seguimiento
 */

/**
 * @swagger
 * /api/tracking/events:
 *   post:
 *     tags: [Tracking]
 *     summary: Registrar un evento de seguimiento
 *     description: Solo OPERADOR y ADMIN pueden registrar eventos. Primero valida el envío y actualiza su estado en Shipment, luego guarda el evento en Tracking.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guia
 *               - status
 *               - location
 *             properties:
 *               guia:
 *                 type: string
 *                 example: LD-123456
 *               status:
 *                 type: string
 *                 enum: [EN_RUTA, ENTREGADO]
 *                 example: EN_RUTA
 *               location:
 *                 type: string
 *                 example: Mendoza
 *     responses:
 *       201:
 *         description: Evento registrado y estado actualizado
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token ausente, vencido o inválido
 *       403:
 *         description: El rol no tiene permisos suficientes
 *       404:
 *         description: Envío no encontrado
 *       409:
 *         description: Transición de estado no permitida
 *       502:
 *         description: Error de comunicación con Shipment
 *       504:
 *         description: Tiempo de espera agotado
 *       500:
 *         description: Error interno al guardar el evento
 */

// Registrar un evento de seguimiento.
// Solo OPERADOR y ADMIN pueden registrar eventos.
router.post(
  '/events',
  verifyToken,
  checkRole(['OPERADOR', 'ADMIN']),
  async (req, res) => {
    try {
      const {
        shipmentId,
        estado,
        ubicacion,
        guia,
        status,
        location
      } = req.body;

      const identificador = guia ?? shipmentId;

      const guiaFinal =
        identificador !== undefined && identificador !== null
          ? String(identificador).trim()
          : '';

      const statusInput = status ?? estado;

      const statusFinal =
        typeof statusInput === 'string'
          ? statusInput.trim().toUpperCase()
          : '';

      const locationInput =
        location ?? ubicacion ?? 'Centro de Distribución Principal';

      const locationFinal =
        typeof locationInput === 'string'
          ? locationInput.trim()
          : '';

      if (!guiaFinal || !statusFinal || !locationFinal) {
        return res.status(400).json({
          error: 'Faltan campos obligatorios: guia, status y location'
        });
      }

      if (!ESTADOS_PERMITIDOS.includes(statusFinal)) {
        return res.status(400).json({
          error: 'El estado debe ser EN_RUTA o ENTREGADO'
        });
      }

      // 1. Verificar que el envío exista y que el usuario
      // tenga permiso para consultarlo.
      let shipment;

      try {
        shipment = await validateShipment(guiaFinal, req.token);
      } catch (error) {
        console.error(
          '[Tracking] Error validando el envío:',
          error.message
        );

        if (error.status === 401 || error.status === 403) {
          return res.status(error.status).json({
            error: 'No tenés permiso para operar sobre este envío'
          });
        }

        if (
          error.name === 'TimeoutError' ||
          error.name === 'AbortError'
        ) {
          return res.status(504).json({
            error: 'El servicio de envíos tardó demasiado en responder'
          });
        }

        return res.status(502).json({
          error: 'No se pudo validar el envío con Order & Shipment Service'
        });
      }

      if (!shipment) {
        return res.status(404).json({
          error: 'No existe un envío registrado con esa guía'
        });
      }

      // 2. Solicitar a Shipment la actualización del estado.
      // Shipment es el propietario del estado actual del envío.
      let resultadoActualizacion;

      try {
        resultadoActualizacion = await updateShipmentStatus(
          shipment.guia || guiaFinal,
          statusFinal,
          req.token
        );
      } catch (error) {
        console.error(
          '[Tracking] Shipment rechazó la actualización:',
          error.message
        );

        if (error.status === 401 || error.status === 403) {
          return res.status(error.status).json({
            error: 'No tenés autorización para actualizar este envío'
          });
        }

        if (error.status === 404) {
          return res.status(404).json({
            error: 'No se encontró el envío en Shipment'
          });
        }

        if (error.status === 409) {
          return res.status(409).json({
            error: error.message,
            detalles: error.details
          });
        }

        if (error.status === 400) {
          return res.status(400).json({
            error: error.message
          });
        }

        if (
          error.name === 'TimeoutError' ||
          error.name === 'AbortError'
        ) {
          return res.status(504).json({
            error: 'Shipment tardó demasiado en actualizar el estado'
          });
        }

        return res.status(502).json({
          error: 'No se pudo actualizar el estado en Shipment'
        });
      }

      // 3. Una vez aceptado el cambio por Shipment,
      // registrar el evento en la base de datos de Tracking.
      const nuevoEvento = await Tracking.create({
        guia: shipment.guia || guiaFinal,
        status: statusFinal,
        location: locationFinal,
        registradoPor: req.user?.email || req.user?.sub,
        timestamp: new Date()
      });

      return res.status(201).json({
        message: 'Estado actualizado y evento de seguimiento registrado exitosamente',
        actualizacion: resultadoActualizacion,
        evento: nuevoEvento
      });

    } catch (error) {
      console.error('[Tracking] Error guardando evento:', error);

      return res.status(500).json({
        error: 'Error al guardar el evento de seguimiento'
      });
    }
  }
);

/**
 * @swagger
 * /api/tracking/{guia}:
 *   get:
 *     tags: [Tracking]
 *     summary: Consultar el historial de un envío
 *     description: El propietario puede consultar su propio envío. OPERADOR y ADMIN pueden consultar cualquier envío.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: guia
 *         required: true
 *         description: Número de guía del envío
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historial de seguimiento encontrado
 *       400:
 *         description: Guía obligatoria
 *       401:
 *         description: Token ausente, vencido o inválido
 *       403:
 *         description: Sin permisos para consultar el envío
 *       404:
 *         description: Envío o historial no encontrado
 *       502:
 *         description: Error de comunicación con Shipment
 *       504:
 *         description: Tiempo de espera agotado
 *       500:
 *         description: Error interno
 */

/**
 * Consulta el historial de un envío.
 * Shipment verifica que la guía exista y que el usuario
 * tenga permiso para consultar ese envío.
 */
async function consultarHistorial(req, res) {
  try {
    const guia = String(req.params.guia ?? '').trim();

    if (!guia) {
      return res.status(400).json({
        error: 'La guía es obligatoria'
      });
    }

    let shipment;

    try {
      shipment = await validateShipment(guia, req.token);
    } catch (error) {
      console.error(
        '[Tracking] Error verificando permisos:',
        error.message
      );

      if (error.status === 403) {
        return res.status(403).json({
          error: 'No tenés permiso para consultar este historial'
        });
      }

      if (error.status === 401) {
        return res.status(401).json({
          error: 'No se pudo autenticar la consulta del envío'
        });
      }

      if (
        error.name === 'TimeoutError' ||
        error.name === 'AbortError'
      ) {
        return res.status(504).json({
          error: 'El servicio de envíos tardó demasiado en responder'
        });
      }

      return res.status(502).json({
        error: 'No se pudo consultar el servicio de envíos'
      });
    }

    if (!shipment) {
      return res.status(404).json({
        error: 'No existe un envío registrado con esa guía'
      });
    }

    // Buscar los eventos después de verificar los permisos.
    const eventos = await Tracking.find({
      guia: shipment.guia || guia
    }).sort({ timestamp: -1 });

    if (eventos.length === 0) {
      return res.status(404).json({
        error: 'Todavía no hay eventos de seguimiento para esta guía'
      });
    }

    return res.status(200).json({
      guia: shipment.guia || guia,
      totalEventos: eventos.length,
      eventos
    });

  } catch (error) {
    console.error(
      '[Tracking] Error consultando historial:',
      error
    );

    return res.status(500).json({
      error: 'Error al consultar el historial de seguimiento'
    });
  }
}

// Consultar historial por guía.
router.get(
  '/:guia',
  verifyToken,
  consultarHistorial
);

// Ruta anterior, conservada por compatibilidad.
router.get(
  '/events/:guia',
  verifyToken,
  consultarHistorial
);

export default router;
