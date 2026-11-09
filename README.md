# Plataforma de Logística, Gestión de Envíos y Trazabilidad

- **Materia:** Programación Distribuida
- **Carrera:** Licenciatura en Sistemas de Información (Universidad Champagnat)
- **Trabajo Práctico:** N° 7 - Integración de Microservicios, Seguridad (JWT/RBAC) y Contenerización Completa
- **Grupo:** Logística Distribuida

---

## 📌 Resumen del Trabajo Práctico (TP7)

El objetivo de este trabajo es la consolidación e integración total del ecosistema de microservicios distribuido. Se implementó persistencia real desacoplada con MongoDB para cada servicio, securización completa de endpoints eliminando fallbacks hardcodeados de variables de entorno (`JWT_SECRET`), control de acceso basado en roles (RBAC) y empaquetado unificado mediante Docker Compose.

---

## Integrantes del Equipo

- Brian Villalba
- Thomas Rodríguez
- Juan Ignacio Colucci
- Nicolás Fenoy
- Gustavo Balderrama

---

## Arquitectura del Sistema y Microservicios

El sistema implementa una arquitectura distribuida basada en **4 microservicios independientes**, orquestados mediante **Docker Compose**, con bases de datos MongoDB desacopladas (Database-per-Service) y autenticación centralizada basada en tokens JWT con control de accesos basado en roles (RBAC).

## Responsabilidades Funcionales

1. **auth-service (Puerto 4000)**
   - **Responsabilidad:** Registro, autenticación de usuarios y generación de tokens JWT firmados.
   - **Seguridad:** Manejo de contraseñas encriptadas, validación de variables de entorno y asignación de roles (`CLIENTE`, `OPERADOR`, `ADMIN`).
   - **Base de Datos:** `auth-db` (MongoDB).

2. **order-shipment-service (Puerto 3001)**
   - **Responsabilidad:** Gestión del ciclo de vida de pedidos, cotización de tarifas según peso/dimensiones y emisión de guías de despacho. Consume internamente el servicio de cobertura.
   - **Base de Datos:** `DB_Shipments` (MongoDB).

3. **coverage-logistics-service (Puerto 3002)**
   - **Responsabilidad:** Administración de centros de distribución (hubs), definición de zonas logísticas y validación de cobertura geográfica por Código Postal.
   - **Base de Datos:** `DB_Logistics` (MongoDB).

4. **tracking-dispatch-service (Puerto 3003)**
   - **Responsabilidad:** Registro y consulta de trazabilidad operativa en tiempo real, eventos de escaneo, actualización de estados de paquetes y confirmación de entregas con datos persistidos en MongoDB.
   - **Base de Datos:** `DB_Tracking` (MongoDB).

---

## Seguridad y Autenticación (JWT + RBAC)

Todos los endpoints protegidos del ecosistema requieren la cabecera HTTP de autorización:

`Authorization: Bearer <TU_TOKEN_JWT>`

- **Autenticación (JWT):** Generada por `auth-service` en `/api/auth/login`. Requiere la variable de entorno `JWT_SECRET` definida en el sistema (sin valores fallback en código).
- **Control de Acceso (RBAC):** Restricción de endpoints según el rol embebido en el token:
  - **CLIENTE:** Consulta de cotizaciones, creación de envíos propios y rastreo de paquetes.
  - **OPERADOR:** Actualización de estados en ruta, escaneo de eventos de tracking y gestión de hubs.
  - **ADMIN:** Control total del sistema y gestión de usuarios.

---

## Requisitos Previos

Para clonar y ejecutar la plataforma se requiere:

- Git
- Docker Desktop (con soporte WSL 2 habilitado en Windows)
- Node.js v20+ *(opcional, solo para desarrollo local fuera de contenedores)*

---

## Despliegue y Ejecución con Docker Compose

Toda la infraestructura (los 4 microservicios + las instancias de MongoDB) está contenerizada y orquestada para iniciar de forma unificada.

1. **Clonar el repositorio:**
   `git clone https://github.com/Bre1ker1/Logistica-Distribuida.git`
   `cd Logistica-Distribuida`

2. **Variables de Entorno:**
   `copy .env.example .env`

3. **Compilación y Levantamiento:**
   `docker-compose up --build`

---

## Verificación de Servicios

- **Servicio de Autenticación:**  
  `POST http://localhost:4000/api/auth/login`

- **Servicio de Envíos y Pedidos:**  
  `GET http://localhost:3001/api/shipments`

- **Servicio de Cobertura Logística:**  
  `GET http://localhost:3002/api/coverage`

- **Servicio de Seguimiento (Tracking):**  
  `POST http://localhost:3003/api/tracking/events`  
  `GET http://localhost:3003/api/tracking/events/:guia`

---

## Estructura del Proyecto

Logistica-Distribuida/
├── docs/                           # Documentación y diagramas de arquitectura
├── services/
│   ├── auth-service/               # Microservicio de Autenticación y Usuarios (Puerto 4000)
│   ├── order-shipment-service/     # Microservicio de Envíos y Pedidos (Puerto 3001)
│   ├── coverage-logistics-service/ # Microservicio de Cobertura Logística (Puerto 3002)
│   └── tracking-dispatch-service/  # Microservicio de Tracking y Despacho (Puerto 3003)
├── .gitignore                      # Exclusión de archivos (ignora node_modules y .env)
├── docker-compose.yml              # Orquestador multi-contenedor
└── README.md
