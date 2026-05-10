import Path from 'path';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Determine __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

// Load OpenAPI (Swagger) document
const swaggerDocument = yaml.load(readFileSync(Path.join(__dirname, 'oas3.yaml'), 'utf8'));

// Create Express app
const app = express();

/**
 * Configure Express.js parsing middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Serve openAPI
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req,res,next) => {
    console.log(req.method + ' ' + req.url)
    next()
})

/* Default 404 handler */
app.use((req, res) => {
    res.status(404);
    res.json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n🐄 ##########################################`);
    console.log(`🚀 MuccApp è ONLINE!`);
    console.log(`📡 In ascolto su: http://localhost:${PORT}`);
    console.log(`📖 Documentazione: http://localhost:${PORT}/api-docs`);
    console.log(`##############################################\n`);
});