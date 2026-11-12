
# Arquitectura de la Plataforma de Logística Distribuida

- **Materia:** Programación Distribuida
- **Trabajo Práctico:** TP5 – De API REST a Microservicios
- **Universidad:** Universidad Champagnat
- **Proyecto:** Logística Distribuida

## 1. Inventario funcional de la aplicación base

La siguiente tabla representa el inventario funcional utilizado como punto de partida para el análisis de descomposición del TP5. Describe las responsabilidades del sistema inicial y no debe confundirse con los endpoints efectivamente implementados en la versión distribuida actual.

| Funcionalidad de la aplicación base | Responsabilidad | Datos involucrados | Dependencias |
|---|---|---|---|
| Registro de envíos | Registrar paquetes y calcular su costo | Origen, destino, peso y cliente | Clientes, cobertura y tarifas |
| Consulta de envíos | Consultar información y estado | Guía, envío y estado | Gestión de envíos |
| Validación de cobertura | Comprobar si existe servicio en una zona | Código postal y zona | Cobertura logística |
| Despacho | Asignar paquetes para su traslado | Paquete, vehículo y repartidor | Envíos y personal |
| Tracking | Registrar eventos de movimiento | Guía, ubicación, fecha y estado | Envíos y tracking |

## 2. Identificación de acoplamientos

Se identifican tres tipos de acoplamiento que justifican la separación en microservicios.

| Caso | Acoplamiento | Problema | Propuesta de desacoplamiento |
|---|---|---|---|
| 1 | Envíos y personal de reparto | Cambios en la asignación de repartidores pueden afectar la creación de envíos | Separar las responsabilidades operativas de la gestión comercial |
| 2 | Envíos y cobertura | La creación de un envío depende de conocer si una zona tiene cobertura | Consultar Coverage mediante una API REST |
| 3 | Envíos y tracking | El historial de eventos y los datos comerciales tienen necesidades de acceso diferentes | Mantener los eventos en un servicio y una base de datos independientes |

## 3. Microservicios definidos

La implementación actual utiliza cuatro microservicios.

### 3.1 Auth Service

- **Responsabilidad:** registrar usuarios, autenticar credenciales y emitir tokens JWT.
- **Operaciones:** registro y login.
- **Reglas de negocio:** las contraseñas se almacenan mediante bcrypt; el registro público asigna el rol CLIENTE.
- **Datos propios:** usuarios, contraseña hasheada, rol y estado de la cuenta.
- **Base de datos:** MongoDB `DB_Auth`.
- **Endpoints implementados:**
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /health`
- **Dependencias:** ninguna llamada HTTP a los otros microservicios.
- **Fuera de alcance:** gestión operativa de envíos, cobertura y eventos de tracking.

### 3.2 Order Shipment Service

- **Responsabilidad:** gestionar la creación y consulta de envíos y controlar su estado.
- **Operaciones:** crear envío, consultar por guía y actualizar estado.
- **Reglas de negocio:**
  - Requiere usuario autenticado.
  - Valida origen, destino, código postal y peso.
  - Comprueba cobertura antes de crear el envío.
  - Genera una guía única.
  - Solo permite las transiciones CREADO → EN_RUTA y EN_RUTA → ENTREGADO.
  - Solo OPERADOR y ADMIN pueden actualizar el estado.
- **Datos propios:** guía, origen, destino, peso, código postal, costo, hub asignado, propietario y estado.
- **Base de datos:** MongoDB `DB_Shipments`.
- **Endpoints implementados:**
  - `POST /api/shipments`
  - `GET /api/shipments/guia/:guia`
  - `PATCH /api/shipments/guia/:guia/status`
  - `GET /health`
- **Dependencias:** Coverage Logistics Service para validar cobertura.
- **Fuera de alcance:** administración de usuarios, gestión de zonas de cobertura y almacenamiento del historial de tracking.

### 3.3 Coverage Logistics Service

- **Responsabilidad:** validar la cobertura logística a partir del código postal.
- **Operaciones:** consultar si un código postal tiene cobertura activa.
- **Reglas de negocio:** una zona solo se considera cubierta cuando existe un registro activo.
- **Datos propios:** código postal, estado de cobertura, identificador de hub y nombre de zona.
- **Base de datos:** MongoDB `DB_Coverage`.
- **Endpoints implementados:**
  - `GET /api/logistics/coverage/validate`
  - `GET /health`
- **Dependencias:** ninguna dependencia HTTP hacia los otros servicios.
- **Fuera de alcance:** creación de envíos, cálculo de tarifas y registro de eventos de seguimiento.

### 3.4 Tracking Dispatch Service

- **Responsabilidad:** registrar y consultar eventos de seguimiento de envíos.
- **Operaciones:** registrar eventos y consultar el historial por guía.
- **Reglas de negocio:**
  - Solo OPERADOR y ADMIN pueden registrar eventos.
  - Los estados admitidos para registrar eventos son EN_RUTA y ENTREGADO.
  - Antes de guardar el evento, verifica que exista el envío y solicita a Shipment la actualización del estado.
  - Para consultar el historial, valida que el usuario pueda acceder al envío.
- **Datos propios:** guía, estado, ubicación, usuario que registra el evento y fecha.
- **Base de datos:** MongoDB `DB_Tracking`.
- **Endpoints implementados:**
  - `POST /api/tracking/events`
  - `GET /api/tracking/:guia`
  - `GET /health`
- **Ruta de compatibilidad:** `GET /api/tracking/events/:guia`.
- **Dependencias:** Order Shipment Service para verificar envíos y actualizar sus estados.
- **Fuera de alcance:** modificar directamente los datos comerciales del envío y administrar usuarios.

## 4. Tabla general de responsabilidades

| Microservicio | Datos propios | Operaciones principales | Dependencias |
|---|---|---|---|
| Auth | Usuarios y credenciales | Registro y login | Ninguna |
| Shipment | Envíos y estados actuales | Crear, consultar y actualizar envíos | Coverage |
| Coverage | Zonas y cobertura | Validar códigos postales | Ninguna |
| Tracking | Eventos de seguimiento | Registrar eventos y consultar historial | Shipment |

## 5. Propiedad y acceso a los datos

Se aplica el principio Database per Service. Cada servicio es propietario de sus datos y los demás servicios deben acceder mediante su API.

| Recurso | Propietario | Otros servicios que lo consultan | Forma de acceso |
|---|---|---|---|
| Usuarios y credenciales | Auth | Ninguno mediante consulta HTTP por cada petición | JWT emitido por Auth |
| Envíos y estado actual | Shipment | Tracking | HTTP/REST |
| Cobertura y zonas | Coverage | Shipment | HTTP/REST |
| Eventos de seguimiento | Tracking | Consultas autorizadas | API de Tracking |

No se permite que un microservicio consulte directamente la base de datos de otro.

## 6. Comunicación entre microservicios

### 6.1 Matriz de comunicaciones

| Origen | Destino | Método y endpoint | Propósito |
|---|---|---|---|
| Shipment | Coverage | `GET /api/logistics/coverage/validate?cp=5500` | Verificar cobertura antes de crear un envío |
| Tracking | Shipment | `GET /api/shipments/guia/:guia` | Comprobar existencia y permisos del envío |
| Tracking | Shipment | `PATCH /api/shipments/guia/:guia/status` | Solicitar la actualización del estado |

Las llamadas protegidas propagan el token Bearer del usuario que inició la operación.

### 6.2 Configuración de comunicación

Las direcciones de los servicios se configuran mediante variables de entorno.

- `COVERAGE_SERVICE_URL`: dirección base de Coverage utilizada por Shipment.
- `SHIPMENT_SERVICE_URL`: dirección base de Shipment utilizada por Tracking.

En Docker Compose se utilizan nombres de servicios como nombres DNS internos, por ejemplo:

- `http://coverage-logistics-service:3002`
- `http://order-shipment-service:3001`

No se deben utilizar direcciones localhost para comunicar contenedores entre sí.

## 7. Casos de uso trazados

### Caso de uso 1: creación de un envío

1. El cliente envía `POST /api/shipments` a Order Shipment Service con origen, destino, código postal y peso.
2. Shipment valida el JWT y los datos recibidos.
3. Shipment consulta `GET /api/logistics/coverage/validate` en Coverage.
4. Coverage busca el código postal en su propia base de datos y responde si tiene cobertura.
5. Si la zona está cubierta, Shipment calcula un costo provisional, genera una guía y guarda el envío en `DB_Shipments`.
6. Shipment responde con HTTP 201 y los datos del envío creado.

### Caso de uso 2: registro de un evento de seguimiento

1. Un operador envía `POST /api/tracking/events` a Tracking con guía, estado y ubicación.
2. Tracking verifica el JWT y el rol del usuario.
3. Tracking consulta Shipment mediante `GET /api/shipments/guia/:guia`.
4. Shipment comprueba que la guía exista y que el usuario tenga permiso.
5. Tracking solicita mediante `PATCH /api/shipments/guia/:guia/status` la actualización del estado.
6. Shipment valida la transición y actualiza su propia base de datos.
7. Tracking registra el nuevo evento en `DB_Tracking`.
8. Tracking devuelve la confirmación de la operación.

## 8. Diagrama de arquitectura

```text
                         CLIENTE / OPERADOR
                                  |
                                  |
                           JWT Bearer Token
                                  |
             +--------------------+--------------------+
             |                    |                    |
             v                    v                    v
      +-------------+   +------------------+   +-----------------+
      | Auth        |   | Order Shipment   |   | Coverage        |
      | Service     |   | Service          |   | Logistics       |
      | Puerto 4000 |   | Puerto 3001       |   | Puerto 3002     |
      +------+------+   +--------+---------+   +--------+--------+
             |                   |                       |
             v                   | HTTP GET              v
       +-----------+             +-----------------> +-----------+
       | DB_Auth   |                                  | DB_Coverage|
       | MongoDB   |                                  | MongoDB    |
       +-----------+                                  +-----------+
                                 |
                                 | HTTP GET / PATCH
                                 |
                                 v
                      +----------------------+
                      | Tracking Dispatch    |
                      | Service              |
                      | Puerto 3003          |
                      +----------+-----------+
                                 |
                                 v
                         +---------------+
                         | DB_Tracking   |
                         | MongoDB       |
                         +---------------+

              Shipment también posee su propia base:
                         +----------------+
                         | DB_Shipments   |
                         | MongoDB        |
                         +----------------+
```

## 9. Disponibilidad y fallos distribuidos

La solución contempla que un servicio remoto pueda no estar disponible.

- Shipment aplica un tiempo de espera al consultar Coverage.
- Tracking aplica tiempos de espera al comunicarse con Shipment.
- Se diferencian errores de autenticación, autorización, ausencia de recursos y fallos de comunicación.
- Los endpoints `/health` permiten comprobar el estado del servicio y de su conexión con MongoDB.
- Docker Compose utiliza healthchecks para las bases y los microservicios.

### Caso de fallo parcial

Al registrar un evento, Tracking primero solicita la actualización del estado a Shipment y luego persiste el evento en su propia base.

Si Shipment actualiza el estado correctamente pero Tracking falla al guardar el evento, puede producirse una inconsistencia entre el estado actual y el historial.

No se implementó una transacción distribuida ni un patrón Outbox. Esta limitación se reconoce como un riesgo de consistencia eventual.

## 10. Persistencia y despliegue

Cada servicio utiliza una instancia independiente de MongoDB:

| Servicio | Contenedor MongoDB | Base de datos |
|---|---|---|
| Auth | mongo-auth | DB_Auth |
| Shipment | mongo-shipments | DB_Shipments |
| Coverage | mongo-coverage | DB_Coverage |
| Tracking | mongo-tracking | DB_Tracking |

Docker Compose define redes de comunicación, puertos, variables de entorno, volúmenes persistentes, dependencias y healthchecks.

## 11. Seguridad

La autenticación se centraliza en Auth Service. Este servicio utiliza bcryptjs para proteger contraseñas y JWT firmado con HS256.

Los demás servicios verifican el token localmente usando el mismo secreto compartido, sin consultar Auth para cada operación.

Los roles implementados son:

- CLIENTE
- OPERADOR
- ADMIN

El registro público solamente crea usuarios CLIENTE. Las operaciones restringidas utilizan middleware de autorización y responden con HTTP 401 cuando no existe autenticación válida y HTTP 403 cuando el usuario no tiene permisos.

La desactivación de una cuenta no invalida inmediatamente los tokens existentes; estos conservan validez hasta su vencimiento.

## 12. Límites y decisiones de diseño

- Shipment es el propietario del estado actual del envío.
- Tracking es el propietario del historial de eventos.
- Coverage es el propietario de la información de cobertura.
- Auth es el propietario de las credenciales y roles.
- Los servicios acceden a datos externos mediante APIs y no mediante conexiones directas a otras bases.
- La tarifa utilizada actualmente por Shipment es provisional y se calcula como peso multiplicado por 1000.
- No se implementaron endpoints de gestión de hubs, asignación de repartidores, cancelación de envíos ni administración de usuarios.
- La arquitectura es una implementación académica y no contempla todavía mecanismos avanzados de recuperación ante fallos.

## 13. Validación del proyecto

Se realizaron comprobaciones estáticas de sintaxis JavaScript y validación de la configuración de Docker Compose.

Estas verificaciones no sustituyen las pruebas funcionales de ejecución. Para validar integralmente el sistema se deben comprobar:

- Registro y autenticación.
- Rechazo de tokens inválidos o vencidos.
- Restricciones por roles.
- Creación y consulta de envíos.
- Comunicación Shipment-Coverage.
- Comunicación Tracking-Shipment.
- Persistencia en cada base de datos.
- Disponibilidad y recuperación ante fallos.

La evidencia de estas pruebas debe reflejar únicamente las operaciones que hayan sido ejecutadas y verificadas.
