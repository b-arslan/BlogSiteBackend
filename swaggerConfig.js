const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Express API Dökümantasyonu',
    version: '1.0.0',
    description: 'Bu dökümantasyon Express.js API\'si için oluşturulmuştur.',
  },
  servers: [
    {
      url: 'https://your-vercel-backend.vercel.app', // Vercel URL'iniz
      description: 'Vercel Deployment',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./index.js'], // Endpoint'lerinizi barındıran dosyanın yolunu ekleyin
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;