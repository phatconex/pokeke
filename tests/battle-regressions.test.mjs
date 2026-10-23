import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';

// Execute the real methods without starting Phaser's renderer or audio devices.
function method(file, name, globals = {}) {
  const source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(ts.isClassDeclaration);
  const member = cls.members.find(m => m.name?.getText(ast) === name);
  const code = ts.transpileModule(`class Subject { ${member.getText(ast)} }; Subject.prototype.${name}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return vm.runInNewContext(code, globals);
}
const balance = readFileSync('src/config/balance.ts', 'utf8');
const regen = Number(balance.match(/benchRegenPerSec:\s*([\d.]+)/)[1]);
const benchRegen = method('src/scenes/BattleScene.ts', 'benchRegen', { SWITCH: { benchRegenPerSec: regen } });
test('resting Pokemon heal 0.1 HP per second regardless of max HP', () => {
  const player = { onField: true, hp: 100, maxHp: 100 };
  const resting = [100, 1000].map(maxHp => ({ maxHp, member: { hp: 20 } }));
  benchRegen.call({ player, fighters: [player, ...resting] }, 1000);
  for (const f of resting) assert.equal(f.member.hp, 20.1);
});
test('rest healing caps at max HP and skips active or fainted Pokemon', () => {
  const player = { onField: true, hp: 100, maxHp: 100, member: { hp: 50 } };
  const full = { maxHp: 100, member: { hp: 99.95 } };
  const dead = { dead: true, maxHp: 100, member: { hp: 0 } };
  benchRegen.call({ player, fighters: [player, full, dead] }, 1000);
  assert.equal(full.member.hp, 100);
  assert.equal(dead.member.hp, 0);
  assert.equal(player.member.hp, 50);
});
const applyVelocity = method('src/entities/Enemy.ts', 'applyVelocity');
for (const wall of ['right', 'left', 'up', 'down']) {
  test(`enemy slides along a ${wall} wall instead of pushing into it`, () => {
    let velocity;
    const enemy = {
      speedMult: 1, slowUntil: 0, wobbleSeed: 1,
      body: { blocked: { [wall]: true }, touching: { none: true }, setVelocity(x, y) { velocity = { x, y }; } },
      kb: { x: 0, y: 0, scale() {}, lengthSq: () => 0, set() {} },
    };
    const horizontal = wall === 'left' || wall === 'right';
    applyVelocity.call(enemy, horizontal ? (wall === 'left' ? -100 : 100) : 0,
      horizontal ? 0 : (wall === 'up' ? -100 : 100), 16);
    assert.equal(horizontal ? velocity.x : velocity.y, 0);
    assert.ok(Math.abs(horizontal ? velocity.y : velocity.x) > 0);
  });
}
const getHudState = method('src/scenes/BattleScene.ts', 'getHudState', {
  SKILL_SLOTS: ['J', 'K', 'L', 'U'], getGame: () => null,
  t: key => key, moveName: m => m.name, TYPE_COLOR: { flying: 1 }, ultName: () => '',
});
test('switching between three and four moves keeps HUD slots in the same positions', () => {
  const player = {
    species: { id: 'pidgey', name: 'Pidgey', types: ['flying'] },
    skills: [], member: {}, energy: 100, energyMax: 100,
    cooldownLeft: () => 0, cooldownTotal: () => 100,
  };
  const scene = {
    config: { kind: 'lab' }, player, fighters: [], enemies: [], pending: [], clock: 100,
    activeEvo: () => ({}), ultOpen: () => true, mechHud: () => null,
  };
  const skill = slot => ({ slot, move: { name: slot, icon: 'wind', type: 'flying' }, spec: { cost: 1 }, unlocked: true });
  player.skills = ['J', 'K', 'L'].map(skill);
  const first = getHudState.call(scene).skills;
  assert.deepEqual(Array.from(first, s => s.key), ['J', 'K', 'L', 'U', 'Space']);
  assert.equal(first[3].locked, true);
  player.skills = ['J', 'K', 'L', 'U'].map(skill);
  const second = getHudState.call(scene).skills;
  assert.deepEqual(Array.from(second, s => s.key), Array.from(first, s => s.key));
  assert.equal(second[3].locked, false);
});
for (const contact of [
  { blocked: { right: true, down: true }, touching: { none: true }, x: 100, y: 100, corner: true },
  { blocked: {}, touching: { none: false, right: true }, x: 100, y: 0 },
  { blocked: {}, touching: { none: true }, x: 100, y: 30, clear: true },
]) {
  test(`movement handles ${contact.corner ? 'corners' : contact.clear ? 'open ground' : 'enemy contacts'}`, () => {
    let velocity;
    const enemy = {
      speedMult: 1, slowUntil: 0, wobbleSeed: 1,
      body: { ...contact, setVelocity(x, y) { velocity = { x, y }; } },
      kb: { x: 0, y: 0, scale() {}, lengthSq: () => 0, set() {} },
    };
    applyVelocity.call(enemy, contact.x, contact.y, 16);
    if (contact.clear) assert.deepEqual(velocity, { x: 100, y: 30 });
    else if (contact.corner) assert.ok(velocity.x < 0 || velocity.y < 0);
    else { assert.equal(velocity.x, 0); assert.ok(velocity.y !== 0); }
  });
}
test('HUD realigns every icon and label with its slot after the bar moves', () => {
  const align = method('src/scenes/HudScene.ts', 'alignSkillSlot', { SLOT: 54 });
  const object = () => ({ x: -100, y: -100, setPosition(x, y) { this.x = x; this.y = y; return this; }, setText(text) { this.text = text; return this; } });
  const slot = Object.fromEntries(['icon', 'key', 'up', 'name', 'cd', 'lock', 'cost'].map(k => [k, object()]));
  for (const x of [200, 165]) {
    align.call({}, slot, x, 500, 'K');
    assert.equal(slot.icon.x, x + 27);
    assert.equal(slot.key.x, x + 4);
    assert.equal(slot.key.text, 'K');
    assert.equal(slot.up.x, x + 51);
    assert.equal(slot.name.x, x + 27);
    assert.equal(slot.cd.x, x + 27);
    assert.equal(slot.lock.x, x + 27);
    assert.equal(slot.cost.x, x + 4);
    assert.equal(slot.icon.y, 529);
  }
});
const resetBoundary = new Error('run initialization complete');
const initializeBattle = method('src/scenes/BattleScene.ts', 'create', {
  finalizeSpecies: () => {}, resetSfxThrottle: () => { throw resetBoundary; },
});
test('restarting Battle clears tutorial XP suppression and old enemy freeze deadline', () => {
  const scene = {
    tutorial: true, tutReplay: true, tutItems: { pokeball: 99 }, swapFreezeUntil: 85000, evoActive: true,
    casts: new Map(), masteryGain: new Map(), clearFrameTasks() {},
  };
  assert.throws(() => initializeBattle.call(scene), e => e === resetBoundary);
  assert.equal(scene.tutorial, false);
  assert.equal(scene.tutReplay, false);
  assert.equal(scene.tutItems, null);
  assert.equal(scene.swapFreezeUntil, 0);
  assert.equal(scene.evoActive, false);
});
test('HUD uses the same global cap as XP awards in Survival', () => {
  let displayedCap;
  const activeEvo = method('src/scenes/BattleScene.ts', 'activeEvo', {
    levelCap: () => 70,
    evoStatus: (_member, _game, cap) => { displayedCap = cap; return { state: 'capped', levelsLeft: 1 }; },
  });
  const scene = { survivalOwn: {}, player: { member: {}, level: 70 } };
  const result = activeEvo.call(scene, null);
  assert.equal(displayedCap, 70);
  assert.equal(result.atCap, true);
});
test('a Survival run after the tutorial awards XP again', () => {
  const scene = { tutorial: true, casts: new Map(), masteryGain: new Map(), clearFrameTasks() {} };
  assert.throws(() => initializeBattle.call(scene), e => e === resetBoundary);
  const member = { level: 5, xp: 0 };
  scene.fighters = [{ member, species: { name: 'Pikachu' }, xpMult: 1 }];
  scene.activeIdx = 0;
  const awardXp = method('src/scenes/BattleScene.ts', 'awardXp', {
    levelCap: () => 70,
    evolutionReady: () => null,
    gainXp: (m, amount) => { m.xp += amount; return 0; },
  });
  awardXp.call(scene, 7);
  assert.equal(member.xp, 7);
});
