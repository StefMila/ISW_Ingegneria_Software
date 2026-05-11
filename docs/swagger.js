/*
------------------------------------------------------------------------------
documento che genera la documentazione swagger a partire dai commenti presenti nei file delle rotte
definisce: 
- versione dell 'API
- titolo e descrizione dell 'API
- server base (localhost:3000)
- dove leggere i commenti per generare la documentazione (./app/routes/*.js)
------------------------------------------------------------------------------
*/

import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MuccApp API',
      version: '1.0.0',
      description: 'Documentazione API del backend MuccApp'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ]
  },
  apis: ['./app/routes/*.js', './index.js']
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;