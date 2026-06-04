import fs from 'fs';
import path from 'path';

// Recursively get all files in the project
const getAllFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    if (file === 'node_modules' || file === '.git') return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')) {
      results.push(fullPath);
    }
  });
  return results;
};

console.log("🔍 Scanning files for the malformed YAML block...");

const files = getAllFiles('.');
// Regex looking for an open brace, followed by a line break/spaces, followed by "type:"
const targetRegex = /\{\s*[\r\n]\s*type:\s*string/i;
let found = false;

files.forEach((file) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (targetRegex.test(content)) {
      console.log(`\n🎯 FOUND IT! Broken YAML layout in: ${file}`);
      found = true;
      
      // Print the exact lines to show you where it is
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (line.includes('type:') && index > 0 && lines[index - 1].includes('{')) {
          console.log(`Line ${index}:   ${lines[index - 1].trim()}`);
          console.log(`Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
  } catch (err) {
    // Ignore read errors
  }
});

if (!found) {
  console.log("\n❌ Strict match failed. Trying a broader scan for any loose '{' right above a 'type:'...");
  const broadRegex = /\{\s*[\r\n]\s*type:/i;
  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (broadRegex.test(content)) {
        console.log(`⚠️ Suspect file found: ${file}`);
      }
    } catch (e) {}
  });
}