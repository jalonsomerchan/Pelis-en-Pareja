import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/app/recommendations.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {mergePriorities,needsInitialCoverage,titleKey}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const title=(id,type='movie')=>({id,media_type:type});
test('La carga inicial espera una muestra suficiente y ambos tipos en Todo',()=>{
  assert.equal(needsInitialCoverage([title(1,'tv'),title(2,'tv'),title(3,'tv'),title(4,'tv'),title(5,'tv'),title(6,'tv')],'both'),true);
  assert.equal(needsInitialCoverage([title(1),title(2),title(3),title(4),title(5),title(6,'tv')],'both'),false);
  assert.equal(needsInitialCoverage([title(1),title(2)],'movie'),true);
  assert.equal(needsInitialCoverage([title(1),title(2),title(3),title(4),title(5),title(6)],'movie'),false);
});
test('Los síes del grupo se adelantan sin cambiar la tarjeta que se está leyendo',()=>{
  assert.deepEqual(mergePriorities([title(1),title(2),title(3),title(4)],[title(4),title(8),title(9)]).map(titleKey),['movie:1','movie:4','movie:8','movie:2','movie:9','movie:3']);
});
test('La actualización no duplica títulos y separa película y serie con el mismo ID',()=>{
  assert.deepEqual(mergePriorities([title(1),title(2)],[title(1),title(2),title(2),title(2,'tv')]).map(titleKey),['movie:1','movie:2','tv:2']);
});
test('El mazo agotado recibe favoritos nuevos del grupo',()=>{
  assert.deepEqual(mergePriorities([],[title(3),title(4,'tv')]).map(titleKey),['movie:3','tv:4']);
});
