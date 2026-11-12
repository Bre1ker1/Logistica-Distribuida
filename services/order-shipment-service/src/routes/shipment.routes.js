
import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import Shipment from '../models/Shipment.js';
import {
  verifyToken,
  requireRole
} from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Shipments
 *     description: Gestión y seguimiento de envíos
 */

// Transiciones de estado permitidas.
const transicionesPermitidas = {
  CREADO: ['EN_RUTA'],
  EN_RUTA: ['ENTREGADO']
};

/**
 * @swagger
 * /api/shipments:
 *   post:
 *     tags: [Shipments]
 *     summary: Crear un envío
 *     description: Registra un envío después de validar la cobertura del código postal. Requiere autenticación JWT.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origen
 *               - destino
 *               - cp
 *               - peso
 *             properties:
 *               origen:
 *                 type: string
 *                 example: Mendoza
 *               destino:
 *                 type: string
 *                 example: San Rafael
 *               cp:
 *                 type: string
 *                 example: "5600"
 *               peso:
 *                 type: number
 *                 example: 5.5
 *     responses:
 *       201:
 *         description: Envío registrado exitosamente
 *       400:
 *         description: Datos inválidos o zona sin cobertura
 *       401:
 *         description: Token ausente o inválido
 *       502:
 *         description: Respuesta inválida o error del servicio de cobertura
 *       503:
 *         description: Servicio de cobertura no disponible
 *       504:
 *         description: Tiempo de espera agotado al consultar cobertura
 *       500:
 *         description: Error interno o configuración incompleta
 */

// Crear un nuevo envío.
router.post('/shipments', verifyToken, async (req, res) => {
  try {
    const { origen, destino, cp, peso } = req.body;

    // Normalizar origen y destino.
    const origenNormalizado =
      typeof origen === 'string' ? origen.trim() : '';

    const destinoNormalizado =
      typeof destino === 'string' ? destino.trim() : '';

    // Validar datos obligatorios.
    if (
      !origenNormalizado ||
      !destinoNormalizado ||
      cp === undefined ||
      cp === null ||
      peso === undefined ||
      peso === null
    ) {
      return res.status(400).json({
        error: 'Origen, destino, código postal y peso son obligatorios'
      });
    }

    // Validar peso.
    const weight = Number(peso);

    if (!Number.isFinite(weight) || weight <= 0) {
      return res.status(400).json({
        error: 'El peso debe ser un número mayor a cero'
      });
    }

    // Validar código postal.
    const destinationCp = String(cp).trim();

    if (!/^\d{4}$/.test(destinationCp)) {
      return res.status(400).json({
        error: 'El código postal debe tener cuatro dígitos'
      });
    }

    // Verificar usuario autenticado.
    if (!req.user?.email) {
      return res.status(401).json({
        error: 'El token no contiene información válida del usuario'
      });
    }

    // Verificar configuración del servicio de cobertura.
    const coverageUrl = process.env.COVERAGE_SERVICE_URL;

    if (!coverageUrl) {
      console.error('[Shipment] COVERAGE_SERVICE_URL no está configurada');

      return res.status(500).json({
        error: 'No se configuró COVERAGE_SERVICE_URL'
      });
    }

    // Consultar cobertura.
    let coverageResponse;

    try {
      coverageResponse = await fetch(
        `${coverageUrl}/api/logistics/coverage/validate?cp=${encodeURIComponent(destinationCp)}`,
        {
          headers: {
            Authorization: `Bearer ${req.token}`
          },
          signal: AbortSignal.timeout(5000)
        }
      );
    } catch (error) {
      console.error('[Shipment] Error al conectar con Coverage:', error);

      if (
        error.name === 'TimeoutError' ||
        error.name === 'AbortError'
      ) {
        return res.status(504).json({
          error: 'El servicio de cobertura tardó demasiado en responder'
        });
      }

      return res.status(503).json({
        error: 'El servicio de cobertura no está disponible'
      });
    }

    // Comprobar respuesta del servicio de cobertura.
    if (!coverageResponse.ok) {
      console.error(
        '[Shipment] Coverage respondió con estado:',
        coverageResponse.status
      );

      return res.status(502).json({
        error: 'El servicio de cobertura devolvió un error',
        statusServicioCobertura: coverageResponse.status
      });
    }

    // Leer respuesta JSON de Coverage.
    let coverageData;

    try {
      coverageData = await coverageResponse.json();
    } catch (error) {
      console.error(
        '[Shipment] Respuesta JSON inválida de Coverage:',
        error
      );

      return res.status(502).json({
        error: 'El servicio de cobertura devolvió una respuesta inválida'
      });
    }

    // Verificar si la zona tiene cobertura.
    if (
      !coverageData ||
      typeof coverageData !== 'object' ||
      !coverageData.valid ||
      !coverageData.hubId
    ) {
      return res.status(400).json({
        error: 'La zona no tiene cobertura disponible'
      });
    }

    // Calcular tarifa provisional.
    // Debe reemplazarse por el tarifario real del negocio.
    const cost = weight * 1000;

    // Generar guía única.
    const guia = `LD-${randomUUID()}`;

    // Crear envío en MongoDB.
    const newShipment = await Shipment.create({
      guia,
      origen: origenNormalizado,
      destino: destinoNormalizado,
      weight,
      destinationCp,
      cost,
      hubAsignado: coverageData.hubId,
      creadoPor: req.user.email,
      status: 'CREADO'
    });

    return res.status(201).json({
      message: 'Envío registrado exitosamente',
      envio: newShipment
    });

  } catch (error) {
    console.error('[Shipment Error]', error);

    return res.status(500).json({
      error: 'Error interno en el servicio de envíos'
    });
  }
});

/**
 * @swagger
 * /api/shipments/guia/{guia}:
 *   get:
 *     tags: [Shipments]
 *     summary: Consultar un envío por su guía
 *     description: Permite consultar un envío a su propietario, a un OPERADOR o a un ADMIN.
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
 *         description: Envío encontrado
 *       401:
 *         description: Token ausente o inválido
 *       403:
 *         description: El usuario no tiene permiso para consultar este envío
 *       404:
 *         description: Envío no encontrado
 *       500:
 *         description: Error interno
 */

// Consultar un envío por su número de guía.
router.get('/shipments/guia/:guia', verifyToken, async (req, res) => {
  try {
    const guia = String(req.params.guia || '').trim();

    const shipment = await Shipment.findOne({ guia });

    if (!shipment) {
      return res.status(404).json({
        error: 'Envío no encontrado'
      });
    }

    // Verificar permisos de consulta.
    const esPersonalAutorizado = ['OPERADOR', 'ADMIN'].includes(
      req.user?.role
    );

    const esPropietario =
      shipment.creadoPor === req.user?.email;

    if (!esPersonalAutorizado && !esPropietario) {
      return res.status(403).json({
        error: 'No tenés permiso para consultar este envío'
      });
    }

    return res.status(200).json({
      id: shipment._id,
      guia: shipment.guia,
      status: shipment.status,
      creadoPor: shipment.creadoPor
    });

  } catch (error) {
    console.error('[Shipment] Error consultando el envío:', error);

    return res.status(500).json({
      error: 'Error consultando el envío'
    });
  }
});

/**
 * @swagger
 * /api/shipments/guia/{guia}/status:
 *   patch:
 *     tags: [Shipments]
 *     summary: Actualizar el estado de un envío
 *     description: Solo OPERADOR y ADMIN pueden actualizar estados. Las transiciones permitidas son CREADO a EN_RUTA y EN_RUTA a ENTREGADO.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: guia
 *         required: true
 *         description: Número de guía del envío
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - EN_RUTA
 *                   - ENTREGADO
 *                 example: EN_RUTA
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       400:
 *         description: Estado inválido
 *       401:
 *         description: Token ausente o inválido
 *       403:
 *         description: El usuario no tiene permisos suficientes
 *       404:
 *         description: Envío no encontrado
 *       409:
 *         description: Transición no permitida o conflicto de actualización
 *       500:
 *         description: Error interno
 */

// Actualizar el estado de un envío.
router.patch(
  '/shipments/guia/:guia/status',
  verifyToken,
  requireRole('OPERADOR', 'ADMIN'),
  async (req, res) => {
    try {
      const guia = String(req.params.guia || '').trim();

      const nuevoEstado =
        typeof req.body?.status === 'string'
          ? req.body.status.trim().toUpperCase()
          : '';

      if (!guia) {
        return res.status(400).json({
          error: 'El número de guía es obligatorio'
        });
      }

      // Los estados deben pertenecer a los permitidos por este endpoint.
      if (!['EN_RUTA', 'ENTREGADO'].includes(nuevoEstado)) {
        return res.status(400).json({
          error: 'El estado debe ser EN_RUTA o ENTREGADO'
        });
      }

      const shipment = await Shipment.findOne({ guia });

      if (!shipment) {
        return res.status(404).json({
          error: 'Envío no encontrado'
        });
      }

      // Comprobar si la transición solicitada está permitida.
      const estadosPermitidos =
        transicionesPermitidas[shipment.status] || [];

      if (!estadosPermitidos.includes(nuevoEstado)) {
        return res.status(409).json({
          error: 'La transición de estado no está permitida',
          estadoActual: shipment.status,
          estadosPermitidos
        });
      }

      const estadoAnterior = shipment.status;

      // Actualizar solamente si el estado no cambió desde la consulta.
      const shipmentActualizado = await Shipment.findOneAndUpdate(
        {
          _id: shipment._id,
          status: estadoAnterior
        },
        {
          $set: {
            status: nuevoEstado
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!shipmentActualizado) {
        return res.status(409).json({
          error: 'El estado del envío cambió durante la operación. Intentá nuevamente.'
        });
      }

      return res.status(200).json({
        message: 'Estado del envío actualizado correctamente',
        envio: {
          guia: shipmentActualizado.guia,
          estadoAnterior,
          estadoActual: shipmentActualizado.status
        }
      });

    } catch (error) {
      console.error('[Shipment] Error actualizando estado:', error);

      return res.status(500).json({
        error: 'Error interno al actualizar el estado del envío'
      });
    }
  }
);

export default router;
