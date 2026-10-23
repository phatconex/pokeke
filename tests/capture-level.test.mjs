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
const balance = load(resolve('src/config/balance.ts'));
test('all badge counts share the global maximum level', () => {
  for (let badges = 0; badges <= 8; badges++) assert.equal(balance.levelCapFor(badges), balance.STATS.maxLevel);
});
test('overleveled Pokemon receive less XP but never zero', () => {
  assert.equal(balance.STATS.xpLevelMult(10, 10), 1);
  assert.equal(balance.STATS.xpLevelMult(10, 15), 1);
  assert.equal(balance.STATS.xpLevelMult(13, 10), 1);
  assert.equal(balance.STATS.xpLevelMult(18, 10), 0.5);
  assert.equal(balance.STATS.xpLevelMult(40, 10), 0.1);
});
function stateFunction(name, globals) {
  const path = 'src/game/state.ts';
  const source = readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name);
  const code = ts.transpileModule(`${fn.getText(ast).replace(/^export /, '')}\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return vm.runInNewContext(code, globals);
}
test('Pokemon with no badges can gain XP through level 15 and evolve at 16', () => {
  const levelCap = stateFunction('levelCap', { current: { badges: [] }, levelCapFor: balance.levelCapFor });
  const gainXp = stateFunction('gainXp', { levelCap, xpToNext: balance.STATS.xpForLevel, memberStats: () => ({ maxHp: 100 }) });
  const evolutionReady = stateFunction('evolutionReady', { POKEMON: data.POKEMON, evolutionsOf: data.evolutionsOf });
  const member = { speciesId: 'charmander', level: 15, xp: 0, hp: 100 };
  assert.equal(gainXp(member, balance.STATS.xpForLevel(15)), 1);
  assert.equal(member.level, 16);
  assert.equal(evolutionReady(member), 'charmeleon');
});
test('badge gates on skill upgrades remain unchanged', () => {
  assert.equal(balance.skillGate(0), 1);
  assert.equal(balance.skillGate(1), 2);
});
