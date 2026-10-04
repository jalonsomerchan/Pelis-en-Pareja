import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist/pelis-en-pareja/browser');
const port=Number(process.argv[2] || 4200);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try{const raw=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(root,'.'+raw);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}try{const info=await stat(file);if(!info.isFile())file=resolve(root,'index.html');}catch{if(extname(raw)){res.writeHead(404);res.end();return;}file=resolve(root,'index.html');}res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));}catch{res.writeHead(500);res.end('Build the app with npm run build first.');}}).listen(port,'127.0.0.1',()=>console.log(`Pelis en pareja: http://127.0.0.1:${port}`));
