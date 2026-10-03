import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

const dataDir = path.resolve(process.cwd(), 'src/data');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function handleDataRequest(req: any, res: any, file: string) {
  ensureDataDir();
  const filePath = path.join(dataDir, `${file}.json`);

  if (req.method === 'GET') {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.end(content);
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to read file' }));
      }
    } else {
      // Return empty object/array if not found depending on the file
      res.setHeader('Content-Type', 'application/json');
      if (file === 'scenarios') {
         res.end(JSON.stringify(null)); // Send null to indicate missing so frontend can use defaults
      } else {
         res.end(JSON.stringify({}));
      }
    }
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        // Validate JSON
        JSON.parse(body);
        fs.writeFileSync(filePath, body, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON or write error' }));
      }
    });
  } else {
    res.statusCode = 405;
    res.end('Method Not Allowed');
  }
}

export function dataApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-data-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        
        const match = req.url.match(/^\/api\/data\/([a-zA-Z0-9_-]+)$/);
        if (match) {
          const file = match[1];
          return handleDataRequest(req, res, file);
        }
        next();
      });
    },
  };
}
