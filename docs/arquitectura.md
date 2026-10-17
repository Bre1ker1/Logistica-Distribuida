# Documentación de Arquitectura: Plataforma de Logística, Gestión de Envíos y Trazabilidad

- **Materia:** Programación Distribuida
- **Trabajo Práctico:** N° 5 - De API REST a Microservicios
- **Universidad:** Universidad Champagnat
- **Grupo:** Logística Distribución

---

## 1. Inventario de la Aplicación Existente (Monolítica Inicial)

A continuación se detalla la estructura previa del sistema unificado antes de realizar la migración a microservicios.

| Funcionalidad / Endpoint | Responsabilidad actual | Datos utilizados | Dependencias |
| :--- | :--- | :--- | :--- |
| `POST /api/envios` | Registra un nuevo paquete, calcula el costo según dimensiones y asigna un depósito. | Peso, dimensiones, origen, destino, cliente, depósito. | Módulo de Clientes, Módulo de Depósitos. |
| `GET /api/envios/{id}` | Consulta información general del envío y su estado comercial. | ID de envío, estado, costo, datos del destinatario. | Módulo de Envío. |
| `GET /api/cobertura/zonas` | Valida si un código postal o zona geográfica tiene servicio activo. | Códigos postales, tarifas por zona, depósitos. | Módulo Geográfico. |
| `POST /api/despachos` | Asigna un paquete a un vehículo/repartidor para su salida a ruta. | ID de paquete, ID de repartidor, ID de vehículo. | Módulo de Envíos, Módulo de Personal. |
| `POST /api/tracking/escaneo` | Registra el escaneo físico del paquete en punto de acopio o por el repartidor. | ID de paquete, ubicación GPS, estado operativo. | Módulo de Envíos, Módulo de Tracking. |
| `GET /api/tracking/{guia}` | Muestra el historial completo de eventos del envío al cliente. | Número de guía, lista de eventos con fecha y hora. | Módulo de Tracking. |

---

## 2. Identificación de Acoplamientos en la Aplicación Base

Se identifican tres casos críticos de acoplamiento en el sistema monolítico previo que justifican la separación:

| Caso | Acoplamiento detectado | Problema generado | Propuesta de desacople |
| :---: | :--- | :--- | :--- |
| **1** | **Acoplamiento de Datos (Envío - Repartidores):** El módulo de envíos modifica directamente el estado del repartidor a "Ocupado" al crear una hoja de ruta. | Si cambia la lógica de asignación de personal, se rompe la creación de envíos. Imposibilidad de escalar repartidores de forma independiente. | Mover la gestión de repartidores a un servicio de despacho que exponga un endpoint explícito para asignar paquetes. |
| **2** | **Lógica de Negocio en Cascada (Cotización - Cobertura):** La función de creación de envío calcula el precio consultando directamente las tablas de depósitos y rutas. | La consulta a depósitos bloquea la creación del envío si la base de datos de depósitos experimenta latencia o caída. | El servicio de envíos solicitará la validación de zona a través de un contrato REST ligero al servicio de cobertura, recibiendo solo la confirmación. |
| **3** | **Cohesión Débil (Registro vs. Trazabilidad):** La tabla principal de `Envios` guarda tanto los datos comerciales (precios, facturación) como el historial de escaneos GPS en tiempo real. | Alto tráfico de lecturas/escrituras en vivo sobrecargan la tabla comercial, haciendo lentos los reportes de ventas y facturación. | Extraer el registro de eventos y trazabilidad a un microservicio dedicado optimizado para consultas e inserciones rápidas. |

---

## 3. Propuesta de Microservicios

### 3.1. Fichas de Definición de Microservicios

#### Ficha 1: `Order & Shipment Service` (Gestión de Encomiendas y Pedidos)
* **Responsabilidad principal:** Administración del ciclo de vida comercial del envío, cotización inicial y registro de paquetes.
* **Operaciones:** Crear envío, consultar estado comercial, cancelar paquete, emitir guía de transporte.
* **Reglas de negocio:** Validación de peso/dimensiones máximas; cálculo de tarifa base según peso/volumen; emisión del número de guía único.
* **Datos propios:** `Envio`, `Cliente`, `Destinatario`, `Tarifario`.
* **Endpoints:** 
  * `POST /api/shipments` (Crear envío)
  * `GET /api/shipments/{id}` (Obtener detalle)
  * `PATCH /api/shipments/{id}/cancel` (Cancelar envío)
* **Dependencias:** `Coverage & Logistics Service` (para verificar cobertura de código postal antes de confirmar).
* **Fuera de alcance:** Gestión de vehículos, asignación de choferes, registro de escaneos GPS en ruta.
* **Justificación:** Encapsula la lógica de negocio comercial. Permite cambiar tarifas o promociones sin impactar en la operación logística de calle.

---

#### Ficha 2: `Coverage & Logistics Service` (Cobertura, Hubs y Rutas)
* **Responsabilidad principal:** Gestión de infraestructura logística, centros de distribución (hubs), zonas de cobertura y capacidades operativas.
* **Operaciones:** Consultar zonas activas, asignar depósito de origen/destino, gestionar capacidad de almacenamiento por hub.
* **Reglas de negocio:** Restricción de envíos a zonas sin cobertura; límite de capacidad diaria por centro de acopio.
* **Datos propios:** `Hub` (Centro de acopio), `ZonaCobertura`, `RutaGeografica`, `CapacidadHub`.
* **Endpoints:**
  * `GET /api/logistics/coverage/validate` (Validar CP)
  * `GET /api/logistics/hubs` (Listar centros de acopio)
  * `POST /api/logistics/hubs` (Registrar nuevo hub)
* **Dependencias:** Ninguna (Servicio core de infraestructura).
* **Fuera de alcance:** Precios de envíos, asignación de repartidores individuales, tracking final.
* **Justificación:** Centraliza las reglas geográficas y operativas de la red de distribución.

---

#### Ficha 3: `Tracking & Dispatch Service` (Seguimiento, Despacho e Incidentes)
* **Responsabilidad principal:** Trazabilidad operativa en tiempo real del paquete, asignación de hojas de ruta a repartidores y registro de entregas/novedades.
* **Operaciones:** Registrar escaneo de paquete, asignar paquete a hoja de ruta de repartidor, confirmar entrega (con firma/foto), reportar siniestro/incidente.
* **Reglas de negocio:** Un paquete solo se puede entregar si está en estado "En Ruta"; el historial de tracking es inmutable (solo se agregan eventos).
* **Datos propios:** `TrackingEvent`, `HojaDeRuta`, `Repartidor`, `NovedadIncidente`.
* **Endpoints:**
  * `POST /api/tracking/events` (Registrar nuevo escaneo/evento)
  * `GET /api/tracking/{guia}` (Consultar historial de seguimiento)
  * `POST /api/dispatch/assign` (Asignar paquete a repartidor)
* **Dependencias:** `Order & Shipment Service` (para verificar que la guía existe y está activa).
* **Fuera de alcance:** Cobro de tarifas, alta de clientes, modificación de datos de destino.
* **Justificación:** Absorbe el alto tráfico de peticiones de escaneo y consultas de clientes sin degradar el rendimiento del área de ventas.

---

### 3.2. Tabla General de Responsabilidades

| Microservicio | Responsabilidad | Datos administrados | Funciones principales | Dependencias |
| :--- | :--- | :--- | :--- | :--- |
| **Order & Shipment Service** | Gestión comercial de envíos y cotizaciones. | Envíos, Clientes, Destinatarios, Tarifas. | Registrar envío, calcular costo, cancelar orden. | Coverage & Logistics Service. |
| **Coverage & Logistics Service** | Infraestructura de red, zonas y depósitos. | Hubs, Zonas de cobertura, Capacidad de acopio. | Validar cobertura, gestionar depósitos. | Ninguna. |
| **Tracking & Dispatch Service** | Trazabilidad en tiempo real y repartidores. | Eventos de tracking, Hojas de ruta, Repartidores. | Registrar escaneo, asignar repartidor, confirmar entrega. | Order & Shipment Service. |

---

## 4. Propiedad y Acceso a los Datos

| Dato / Recurso | Servicio propietario | Quién puede consultarlo | Quién puede modificarlo | Forma de acceso |
| :--- | :--- | :--- | :--- | :--- |
| **Datos de Envíos y Tarifas** | `Order & Shipment Service` | `Tracking & Dispatch Service` | Únicamente `Order & Shipment Service` | API REST HTTP (`GET /api/shipments/{id}`) |
| **Zonas de Cobertura y Hubs** | `Coverage & Logistics Service` | `Order & Shipment Service` | Únicamente `Coverage & Logistics Service` | API REST HTTP (`GET /api/logistics/coverage/validate`) |
| **Eventos de Tracking y Rutas** | `Tracking & Dispatch Service` | Clientes públicos / App móvil | Únicamente `Tracking & Dispatch Service` | API REST HTTP (`GET /api/tracking/{guia}`) |

---

## 5. Comunicación entre Microservicios

### 5.1. Matriz de Comunicaciones HTTP/REST

| Origen | Destino | Necesidad | Método / Endpoint | Datos intercambiados | Respuesta esperada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Order & Shipment` | `Coverage & Logistics` | Verificar si el CP destino tiene servicio activo antes de crear la orden. | `GET /api/logistics/coverage/validate?cp=5500` | Query Param: `cp` | `{ "valid": true, "hubId": "HUB-MZA-01" }` |
| `Tracking & Dispatch` | `Order & Shipment` | Validar que el número de guía exista antes de registrar un escaneo. | `GET /api/shipments/guia/{guia}` | Path Param: `guia` | `{ "id": 102, "guia": "ST-992", "status": "ACTIVE" }` |

---

### 5.2. Trazado de Casos de Uso

#### Caso de Uso 1: Registro de un nuevo envío por parte de un cliente
1. **Cliente** realiza una petición `POST /api/shipments` al servicio **Order & Shipment Service**.
2. **Order & Shipment Service** realiza una llamada HTTP `GET /api/logistics/coverage/validate` al servicio **Coverage & Logistics Service** para verificar el Código Postal de destino.
3. **Coverage & Logistics Service** responde enviando confirmación de cobertura y el ID del hub asignado.
4. **Order & Shipment Service** calcula la tarifa, guarda la orden en su base de datos propia y emite el número de guía.
5. **Order & Shipment Service** devuelve al **Cliente** un código HTTP 201 Created con los detalles y el número de guía.

#### Caso de Uso 2: Repartidor escanea paquete y actualiza estado a "En Camino"
1. **Repartidor (App Móvil)** envía un `POST /api/tracking/events` al servicio **Tracking & Dispatch Service**.
2. **Tracking & Dispatch Service** consulta vía HTTP `GET /api/shipments/guia/{guia}` al servicio **Order & Shipment Service** para verificar la existencia y validez de la guía.
3. **Order & Shipment Service** confirma que la guía es válida.
4. **Tracking & Dispatch Service** inserta el evento de escaneo (con GPS, fecha y hora) en su base de datos propia de eventos.
5. **Tracking & Dispatch Service** responde HTTP 200 OK con el registro del evento completado.

---

## 6. Diagrama de Arquitectura

```text
                                +---------------------------+
                                |      CLIENTE / APP        |
                                +-------------+-------------+
                                              |
                     +------------------------+------------------------+
                     |                        |                        |
                     v                        v                        v
        +-------------------------+ +-------------------+ +--------------------------+
        | Order & Shipment        | | Coverage &        | | Tracking & Dispatch      |
        | Service                 | | Logistics Service | | Service                  |
        +------------+------------+ +---------+---------+ +------------+-------------+
        | - Crear Envíos          | | - Validar CPs     | | - Escaneos GPS           |
        | - Calcular Tarifas      | | - Gestionar Hubs  | | - Asignar Repartidores   |
        +------------+------------+ +---------+---------+ +------------+-------------+
                     |                        ^                        |
                     |--- HTTP GET Cobertura -|                        |
                     |                                                 |
                     +<-------------- HTTP GET Valida Guía ------------+
                     |                                                 |
                     v                                                 v
        +-------------------------+                       +--------------------------+
        | Base de Datos           |                       | Base de Datos            |
        | DB_Shipments (SQL)      |                       | DB_Tracking (NoSQL/SQL)  |
        +-------------------------+                       +--------------------------+


