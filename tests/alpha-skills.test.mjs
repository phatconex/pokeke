import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
const source = readFileSync('src/entities/EnemySkills.ts', 'utf8');
const ast = ts.createSourceFile('EnemySkills.ts', source, ts.ScriptTarget.Latest, true);
const funcs = ['profileFor', 'skillTypeOf'].map(name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name).getText(ast).replace(/^export /, '')).join('\n');
const decls = ['T', 'OVERRIDE', 'cache', 'hashOf'].map(name => ast.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === name)).getText(ast)).join('\n');
const api = vm.runInNewContext(ts.transpileModule(`${decls}\n${funcs}\n({profileFor});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);
for (const id of ['pidgeotto', 'pikachu', 'geodude']) {
  test(`${id} alpha has at least four distinct attacks without changing normal profile`, () => {
    const enemy = { species: { id, types: ['electric'] }, stats: { hp: 20, behavior: 'rusher' }, alpha: false };
    const normal = api.profileFor(enemy, false);
    const alpha = api.profileFor({ ...enemy, alpha: true }, false);
    assert.ok(new Set(alpha.kinds).size >= 4);
    assert.equal(api.profileFor(enemy, false).kinds.length, normal.kinds.length);
    assert.notEqual(alpha, normal);
  });
}
