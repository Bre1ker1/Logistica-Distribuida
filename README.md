# 🚚 Plataforma de Logística, Gestión de Envíos y Trazabilidad

- **Materia:** Programación Distribuida
- **Carrera:** Licenciatura en Sistemas de Información (Universidad Champagnat)
- **Trabajo Práctico:** N° 6 - Implementación de Microservicios y Docker
- **Grupo:** Logística Distribuida

---

## 👥 Integrantes del Equipo
- Brian Villalba
- Thomas Rodríguez
- Juan Ignacio Colucci
- Nicolás Fenoy
- Gustavo Balderrama

---

## 🏗️ Arquitectura de Microservicios

El sistema está dividido en 3 microservicios independientes que cumplen responsabilidades funcionales concretas y poseen bases de datos desacopladas:

1. **`order-shipment-service` (Puerto 3001):**
   - *Responsabilidad:* Gestión del ciclo de vida comercial de los envíos, cotización según peso/dimensiones y emisión de guías de despacho.
   - *Base de datos:* `DB_Shipments` (MongoDB).

2. **`coverage-logistics-service` (Puerto 3002):**
   - *Responsabilidad:* Administración de la infraestructura logística, centros de distribución (hubs) y validación de cobertura geográfica por Código Postal.
   - *Base de datos:* `DB_Logistics` (MongoDB).

3. **`tracking-dispatch-service` (Puerto 3003):**
   - *Responsabilidad:* Trazabilidad operativa en tiempo real de los paquetes, escaneos GPS, hojas de ruta y confirmación de entregas.
   - *Base de datos:* `DB_Tracking` (MongoDB).

---

## 🛠️ Requisitos Previos e Instalación de Docker

Para ejecutar este proyecto de forma reproducida se requiere contar con:
- [Git](https://git-scm.com/)
- [Node.js v20+](https://nodejs.org/) (para desarrollo local sin Docker)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con soporte WSL 2 en Windows)

### Verificación de entorno Docker:
Abrir una terminal y ejecutar las comprobaciones mínimas de salud del motor:
```bash
docker --version
docker compose version
docker run --rm hello-world
