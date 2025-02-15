import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';

const router = express.Router();

const version = '1.0.0';

/**
 * Configuración de Swagger
 */
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SuHuevo API',
      version,
      description: 'Documentación de la API con autenticación JWT.',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:60102/api',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, '../controllers/**/*.js'),
    path.join(__dirname, '../application/repositories/mongoose/models/**/*.js'),
  ],
};
console.log("📌 Rutas Swagger cargadas:", options.apis)

const specs = swaggerJSDoc(options);
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
console.log(`✅ Swagger UI disponible en: ${process.env.API_BASE_URL || 'http://localhost:60102/api'}/api-docs`);

export default router;
