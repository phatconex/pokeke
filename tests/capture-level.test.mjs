import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';

const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  let source;
  try { source = readFileSync(file, 'utf8'); }
  catch { return load(file.replace(/\.ts$/, '/index.ts')); }
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => load(resolve(dirname(file), id + '.ts')) });
  return module.exports;
}
const data = load(resolve('src/data/pokemon.ts'));
for (const [id, encountered, expected] of [
  ['pidgeotto', 5, 18], ['pidgeot', 5, 36], ['charmeleon', 6, 16],
  ['metapod', 4, 7], ['butterfree', 4, 10], ['pidgeotto', 25, 25],
  ['pidgey', 5, 5], ['raichu', 5, 5], ['vileplume', 5, 21],
]) {
  test(`${id} encountered at ${encountered} has capture level ${expected}`, () => {
    assert.equal(data.captureLevel(id, encountered), expected);
  });
}
test('stage alpha is three levels above the normal encounter, including evolution floor', () => {
  assert.equal(data.wildEncounterLevel('rattata', 6, true), 9);
  assert.equal(data.wildEncounterLevel('pidgeotto', 8, true), 21);
  assert.equal(data.wildEncounterLevel('pidgeotto', 8, false), 18);
});
