
const obtenerBaseUrl = () => {
  const configuredUrl = process.env.SHIPMENT_SERVICE_URL?.trim();
  const baseUrl = configuredUrl?.replace(/\/+$/, '');

  if (!baseUrl) {
    throw new Error('SHIPMENT_SERVICE_URL no configurado');
  }

  return baseUrl;
};

const validarDatos = (guia, token) => {
  const guiaNormalizada = String(guia ?? '').trim();

  if (!guiaNormalizada) {
    throw new Error('La guía del envío es obligatoria');
  }

  if (!token) {
    throw new Error('Token de autenticación no proporcionado');
  }

  return guiaNormalizada;
};

// Consultar un envío en Order & Shipment Service
export async function validateShipment(guia, token) {
  const baseUrl = obtenerBaseUrl();
  const guiaNormalizada = validarDatos(guia, token);

  const response = await fetch(
    `${baseUrl}/api/shipments/guia/${encodeURIComponent(guiaNormalizada)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(5000)
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = new Error(
      `Error consultando Shipment Service: ${response.status}`
    );

    error.status = response.status;
    throw error;
  }

  try {
    return await response.json();
  } catch {
    const error = new Error(
      'Shipment Service devolvió una respuesta JSON inválida'
    );

    error.status = 502;
    throw error;
  }
}

// Solicitar la actualización del estado en Order & Shipment Service
export async function updateShipmentStatus(guia, status, token) {
  const baseUrl = obtenerBaseUrl();
  const guiaNormalizada = validarDatos(guia, token);

  const estadosPermitidos = ['EN_RUTA', 'ENTREGADO'];

  if (!estadosPermitidos.includes(status)) {
    throw new Error('Estado de envío no permitido');
  }

  const response = await fetch(
    `${baseUrl}/api/shipments/guia/${encodeURIComponent(guiaNormalizada)}/status`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status }),
      signal: AbortSignal.timeout(5000)
    }
  );

  let responseData;

  try {
    responseData = await response.json();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const error = new Error(
      responseData?.error ||
      `Error actualizando Shipment Service: ${response.status}`
    );

    error.status = response.status;
    error.details = responseData;

    throw error;
  }

  if (!responseData) {
    const error = new Error(
      'Shipment Service devolvió una respuesta inválida'
    );

    error.status = 502;
    throw error;
  }

  return responseData;
}
