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
      url: process.env.BLOG_API_URL,
      description: 'Vercel Deployment',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./app.js'], // Endpoint'lerinizi barındıran dosyanın yolunu ekleyin
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;