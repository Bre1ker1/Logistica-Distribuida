
# Plataforma de Logística Distribuida

Proyecto académico de la materia Programación Distribuida de la Licenciatura en Sistemas de Información de la Universidad Champagnat.

El sistema implementa una arquitectura de microservicios para gestionar autenticación, cobertura logística, envíos y trazabilidad.

## Integrantes del equipo

- Brian Villalba
- Thomas Rodríguez
- Juan Ignacio Colucci
- Nicolás Fenoy
- Gustavo Balderrama

**Materia:** Programación Distribuida
**Carrera:** Licenciatura en Sistemas de Información – Universidad Champagnat
**Trabajos prácticos:** TP5, TP6 y TP7


## 1. Arquitectura general

La solución está compuesta por cuatro microservicios independientes, cada uno con su propia base de datos MongoDB.

| Microservicio | Puerto | Responsabilidad | Base de datos |
|---|---:|---|---|
| Auth Service | 4000 | Registro, login y emisión de JWT | DB_Auth |
| Order Shipment Service | 3001 | Creación, consulta y actualización de envíos | DB_Shipments |
| Coverage Logistics Service | 3002 | Validación de cobertura por código postal | DB_Coverage |
| Tracking Dispatch Service | 3003 | Registro y consulta de eventos de seguimiento | DB_Tracking |

Cada servicio administra sus propios datos. Los servicios se comunican mediante HTTP/REST y no acceden directamente a las bases de datos de los demás.

## 2. Tecnologías utilizadas

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Token (JWT)
- bcryptjs
- Swagger / OpenAPI
- Docker
- Docker Compose

## 3. Endpoints implementados

Todas las rutas siguientes utilizan el prefijo indicado. Los endpoints protegidos requieren:

`Authorization: Bearer <TOKEN_JWT>`

### Auth Service – Puerto 4000

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Registrar usuario con rol CLIENTE |
| POST | `/api/auth/login` | Público | Autenticar y obtener JWT |
| GET | `/health` | Público | Comprobar estado del servicio y MongoDB |

### Coverage Logistics Service – Puerto 3002

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| GET | `/api/logistics/coverage/validate?cp=5500` | JWT | Validar cobertura de un código postal |
| GET | `/health` | Público | Comprobar estado del servicio y MongoDB |

### Order Shipment Service – Puerto 3001

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| POST | `/api/shipments` | JWT | Crear un envío |
| GET | `/api/shipments/guia/:guia` | JWT y permisos | Consultar un envío |
| PATCH | `/api/shipments/guia/:guia/status` | OPERADOR o ADMIN | Actualizar estado |
| GET | `/health` | Público | Comprobar estado del servicio y MongoDB |

Las transiciones de estado permitidas son:

- CREADO → EN_RUTA
- EN_RUTA → ENTREGADO

### Tracking Dispatch Service – Puerto 3003

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| POST | `/api/tracking/events` | OPERADOR o ADMIN | Registrar evento y solicitar actualización del envío |
| GET | `/api/tracking/:guia` | JWT y permisos | Consultar historial |
| GET | `/api/tracking/events/:guia` | JWT y permisos | Ruta anterior conservada por compatibilidad |
| GET | `/health` | Público | Comprobar estado del servicio y MongoDB |

Los eventos admiten los estados EN_RUTA y ENTREGADO.

## 4. Comunicación entre servicios

La comunicación entre microservicios se realiza mediante HTTP/REST.

**Creación de un envío:**

1. El cliente envía una solicitud a Order Shipment Service.
2. Shipment consulta Coverage Logistics Service para validar el código postal.
3. Coverage devuelve si existe cobertura y el identificador del hub correspondiente.
4. Shipment calcula un costo provisional y registra el envío en su propia base de datos.
5. Shipment devuelve el número de guía.

**Registro de un evento de seguimiento:**

1. Tracking recibe el evento de seguimiento.
2. Verifica que el usuario tenga un rol autorizado.
3. Consulta Shipment para validar el envío y sus permisos.
4. Solicita a Shipment la actualización del estado.
5. Registra el evento en su propia base de datos.

Shipment es el propietario del estado actual del envío. Tracking es el propietario del historial de eventos.

## 5. Seguridad y autenticación

La autenticación se centraliza en Auth Service.

El sistema utiliza:

- bcryptjs para almacenar contraseñas mediante hash.
- JWT para transmitir la identidad y el rol del usuario.
- Algoritmo HS256 para firmar y verificar tokens.
- Expiración configurable mediante `JWT_EXPIRES_IN`.
- Secreto compartido configurado mediante `JWT_SECRET`.
- Control de acceso basado en roles (RBAC).

### Roles

| Rol | Permisos principales |
|---|---|
| CLIENTE | Crear envíos propios, validar cobertura y consultar sus propios envíos e historiales |
| OPERADOR | Consultar envíos y actualizar estados y eventos |
| ADMIN | Consultar envíos y realizar operaciones restringidas a personal autorizado |

El registro público asigna exclusivamente el rol CLIENTE. La asignación de OPERADOR y ADMIN requiere una intervención administrativa sobre los datos de usuarios; no existe una ruta pública para elegir esos roles.

Los microservicios validan los JWT localmente utilizando el secreto compartido. No consultan Auth Service en cada petición.

Un token ya emitido puede seguir siendo válido hasta su expiración aunque Auth Service deje de estar disponible. La desactivación de una cuenta no invalida inmediatamente los tokens ya emitidos.

## 6. Variables de entorno

Crear un archivo `.env` en la raíz del proyecto.

Variables utilizadas:

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Secreto compartido para firmar y verificar JWT |
| `JWT_EXPIRES_IN` | Duración de los tokens |
| `BCRYPT_ROUNDS` | Cantidad de rondas de bcrypt |

Ejemplo de configuración:

```env
JWT_SECRET=REEMPLAZAR_POR_UN_SECRETO_ALEATORIO
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=10
```

No utilizar el valor de ejemplo como secreto real. El archivo `.env` no debe subirse al repositorio.

## 7. Requisitos previos

Para ejecutar el proyecto mediante contenedores se necesita:

- Git.
- Docker Desktop.
- Docker Compose.
- WSL 2 habilitado en Windows, si se utiliza Docker Desktop sobre Windows.

Para ejecución local fuera de Docker se necesita Node.js compatible con las dependencias de cada servicio y una instancia de MongoDB.

## 8. Ejecución con Docker Compose

Desde la carpeta raíz del proyecto:

1. Crear el archivo `.env` con las variables indicadas anteriormente.
2. Validar la configuración:

```powershell
docker compose config -q
```

3. Construir e iniciar los servicios:

```powershell
docker compose up --build
```

4. Consultar el estado de los contenedores:

```powershell
docker compose ps
```

5. Consultar los registros:

```powershell
docker compose logs
```

Para detener los contenedores:

```powershell
docker compose down
```

Los datos de MongoDB se conservan mediante volúmenes persistentes. No utilizar `docker compose down -v` cuando se quiera conservar la información.

## 9. Puertos y documentación Swagger

| Servicio | API | Swagger UI |
|---|---|---|
| Auth | `http://localhost:4000` | `http://localhost:4000/api-docs` |
| Shipment | `http://localhost:3001` | `http://localhost:3001/api-docs` |
| Coverage | `http://localhost:3002` | `http://localhost:3002/api-docs` |
| Tracking | `http://localhost:3003` | `http://localhost:3003/api-docs` |

Los cuatro servicios exponen `/health` para informar su disponibilidad y el estado de la conexión con MongoDB.

## 10. Persistencia y propiedad de los datos

Se utiliza el patrón Database per Service.

| Base de datos | Servicio propietario |
|---|---|
| DB_Auth | Auth Service |
| DB_Shipments | Order Shipment Service |
| DB_Coverage | Coverage Logistics Service |
| DB_Tracking | Tracking Dispatch Service |

Los servicios no consultan directamente las bases de datos de otros microservicios. La información necesaria se obtiene mediante sus APIs.

## 11. Manejo de errores distribuidos

Las llamadas entre servicios tienen tiempos de espera configurados.

Se contemplan situaciones como:

- Servicio remoto no disponible.
- Tiempo de espera agotado.
- Token inválido o vencido.
- Operación no autorizada.
- Envío inexistente.
- Transición de estado no permitida.
- Respuesta remota inválida.

En el flujo de Tracking existe una posibilidad de fallo parcial: Shipment puede actualizar correctamente el estado y luego fallar la persistencia del evento en Tracking. En ese caso, ambos servicios pueden quedar temporalmente desincronizados. No se implementó un mecanismo de transacción distribuida ni patrón Outbox.

## 12. Estructura del proyecto

```text
Logistica-Distribuida/
├── docs/
│   └── arquitectura.md
├── services/
│   ├── auth-service/
│   │   └── src/
│   ├── coverage-logistics-service/
│   │   └── src/
│   ├── order-shipment-service/
│   │   └── src/
│   └── tracking-dispatch-service/
│       └── src/
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

Cada microservicio cuenta con su propio `package.json`, configuración, modelos, rutas y dependencias.

## 13. Estado de validación y limitaciones

Se realizaron comprobaciones estáticas de sintaxis JavaScript mediante `node --check` y validación de configuración de Docker Compose mediante `docker compose config -q`.

Estas comprobaciones no sustituyen las pruebas de ejecución e integración. Para considerar la solución completamente validada es necesario iniciar los contenedores y comprobar los endpoints, la autenticación, la comunicación entre servicios, la persistencia y los escenarios de fallos.

El sistema constituye una implementación académica de microservicios. No contempla todavía transacciones distribuidas, administración de usuarios mediante una API específica ni mecanismos avanzados de recuperación ante fallos.
