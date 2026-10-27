# 🚚 Plataforma de Logística, Gestión de Envíos y Trazabilidad

- **Materia:** Programación Distribuida
- **Carrera:** Licenciatura en Sistemas de Información (Universidad Champagnat)
- **Trabajo Práctico:** N° 7 - Integración de Microservicios, Seguridad (JWT/RBAC) y Contenerización Completa
- **Grupo:** Logística Distribuida

---

## 👥 Integrantes del Equipo

- Brian Villalba
- Thomas Rodríguez
- Juan Ignacio Colucci
- Nicolás Fenoy
- Gustavo Balderrama

---

## 🏗️ Arquitectura del Sistema y Microservicios

El sistema implementa una arquitectura distribuida basada en **4 microservicios independientes**, orquestados mediante **Docker Compose**, con bases de datos MongoDB desacopladas y autenticación centralizada basada en tokens JWT con control de accesos basado en roles (RBAC).

                        [ Cliente / API Client ]
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                            DOCKER NETWORK                                 │
│                                                                           │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐  │
│  │ auth-service         │   │ order-shipment-service                   │  │
│  │ (Puerto 3000)        │   │ (Puerto 3001)                            │  │
│  │ - Autenticación JWT  │   │ - Cotización y Emisión de Envíos         │  │
│  │ - Registro / Login   │   │ - Cliente HTTP inter-servicio (Coverage) │  │
│  └──────────┬───────────┘   └────────────────────┬─────────────────────┘  │
│             │                                    │                        │
│             ▼                                    ▼                        │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐  │
│  │ coverage-logistics   │   │ tracking-dispatch-service                │  │
│  │ (Puerto 3002)        │   │ (Puerto 3003)                            │  │
│  │ - Hubs y Cobertura   │   │ - Eventos GPS y Trazabilidad             │  │
│  └──────────────────────┘   └──────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
### 🧩 Responsabilidades Funcionales

1. **`auth-service` (Puerto 3000)**
   - **Responsabilidad:** Registro, autenticación de usuarios y generación de tokens JWT firmados.
   - **Seguridad:** Manejo de contraseñas encriptadas y asignación de roles (`CLIENTE`, `OPERADOR`, `ADMIN`).
   - **Base de Datos:** `auth-db` (MongoDB).

2. **`order-shipment-service` (Puerto 3001)**
   - **Responsabilidad:** Gestión del ciclo de vida de pedidos, cotización de tarifas según peso/dimensiones y emisión de guías de despacho. Consume internamente el servicio de cobertura.
   - **Base de Datos:** `DB_Shipments` (MongoDB).

3. **`coverage-logistics-service` (Puerto 3002)**
   - **Responsabilidad:** Administración de centros de distribución (hubs), definición de zonas logísticas y validación de cobertura geográfica por Código Postal.
   - **Base de Datos:** `DB_Logistics` (MongoDB).

4. **`tracking-dispatch-service` (Puerto 3003)**
   - **Responsabilidad:** Registro y consulta de trazabilidad operativa en tiempo real, eventos de escaneo, actualización de estados de paquetes y confirmación de entregas.
   - **Base de Datos:** `DB_Tracking` (MongoDB).

---

## 🔐 Seguridad y Autenticación (JWT + RBAC)

Todos los endpoints protegidos del ecosistema requieren una cabecera HTTP de autorización:

```http
Authorization: Bearer <TU_TOKEN_JWT>
Autenticación (JWT): Generada por auth-service en /api/auth/login.Control de Acceso (RBAC): Restricción de endpoints según el rol embebido en el token:CLIENTE: Consulta de cotizaciones, creación de envíos propios y rastreo de paquetes.OPERADOR: Actualización de estados en ruta, escaneo de eventos de tracking y gestión de hubs.ADMIN: Control total del sistema y gestión de usuarios.🛠️ Requisitos PreviosPara clonar y ejecutar la plataforma se requiere:GitDocker Desktop (con soporte WSL 2 habilitado en Windows)Node.js v20+ (opcional, solo para desarrollo local fuera de contenedores)Verificación de Entorno DockerAntes de iniciar, comprueba el estado del motor Docker ejecutando en la terminal:DOSdocker --version
docker compose version
docker run --rm hello-world
🚀 Despliegue y Ejecución con Docker ComposeToda la infraestructura (los 4 microservicios + la instancia de MongoDB) está contenerizada y orquestada para iniciar de forma unificada.1. Clonar el repositorioDOSgit clone [https://github.com/Bre1ker1/Logistica-Distribuida.git](https://github.com/Bre1ker1/Logistica-Distribuida.git)
cd Logistica-Distribuida
2. Variables de EntornoEl proyecto cuenta con un archivo .env.example en la raíz. Copia o renombra este archivo a .env:DOScopy .env.example .env
3. Compilación y LevantamientoEjecuta el siguiente comando para construir las imágenes e iniciar todos los contenedores en segundo plano:DOSdocker-compose up --build
🧪 Verificación de ServiciosUna vez levantado el entorno, puedes comprobar la disponibilidad de cada microservicio en sus respectivos puertos:ServicioPuertoEndpoint de Prueba / EstadoAuth Service3000POST http://localhost:3000/api/auth/loginOrder Shipment Service3001GET http://localhost:3001/api/shipmentsCoverage Logistics Service3002GET http://localhost:3002/api/coverageTracking Dispatch Service3003POST http://localhost:3003/api/tracking/events📂 Estructura del ProyectoPlaintextLogistica-Distribuida/
├── docs/                      # Documentación y diagramas de arquitectura
├── services/
│   ├── auth-service/          # Microservicio de Autenticación y Usuarios
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── order-shipment-service/# Microservicio de Envíos y Pedidos
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── coverage-logistics-service/ # Microservicio de Cobertura Logística
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── tracking-dispatch-service/  # Microservicio de Tracking y Despacho
│       ├── src/
│       ├── Dockerfile
│       └── package.json
├── .gitignore                  # Configuración de exclusión (ignora node_modules)
├── docker-compose.yml          # Orquestador multi-contenedor
└── README.md
