import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('La PWA ofrece iconos válidos y arranque independiente',async()=>{const manifest=JSON.parse(await readFile(new URL('public/manifest.webmanifest',root),'utf8'));assert.equal(manifest.display,'standalone');assert.equal(manifest.lang,'es');for(const icon of manifest.icons){const data=await readFile(new URL('public/'+icon.src,root));assert.equal(data.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);}assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));});
test('No se almacenan respuestas de autenticación o datos privados en el service worker',async()=>{const config=JSON.parse(await readFile(new URL('ngsw-config.json',root),'utf8'));assert.equal(config.dataGroups,undefined);for(const group of config.assetGroups){for(const url of group.resources.urls ?? [])assert.ok(url.startsWith('https://image.tmdb.org/'));}});
