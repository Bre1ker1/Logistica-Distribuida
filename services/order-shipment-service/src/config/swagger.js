import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order & Shipment Service API',
      version: '1.0.0',
      description: 'Microservicio de gestión de envíos y cotizaciones'
    },
    servers: [{ url: 'http://localhost:3001' }]
  },
  apis: ['./src/routes/*.js']
};

export const swaggerSpec = swaggerJSDoc(options);