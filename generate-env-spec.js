import fs from 'fs';
import path from 'path';

const directoryPath = './'; // La cartella del tuo progetto
const envVars = new Set();

// Funzione ricorsiva per cercare nei file
function searchEnvVars(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory() && !filePath.includes('node_modules')) {
            searchEnvVars(filePath);
        } else if (filePath.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const matches = content.match(/process\.env\.([A-Z0-9_]+)/g);
            if (matches) {
                matches.forEach(m => envVars.add(m.replace('process.env.', '')));
            }
        }
    });
}

searchEnvVars(directoryPath);

// Crea il contenuto per il .env.example
const templateContent = Array.from(envVars).map(v => `${v}=`).join('\n');
fs.writeFileSync('.env.example', templateContent);

console.log('✅ .env.example generato con successo con queste variabili:', Array.from(envVars));