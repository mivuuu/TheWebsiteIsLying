import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { translations, LANGUAGES, translate, graphemes } from '../src/translations/index.js';
import { EVENTS } from '../src/game/events.js';
import { RULES, RECORDS } from '../src/game/content.js';

test('all languages have identical complete keys and placeholders', () => {
  const keys = Object.keys(translations.en).sort();
  for (const language of LANGUAGES) {
    assert.deepEqual(Object.keys(translations[language]).sort(), keys);
    for (const key of keys) {
      const value = translations[language][key];
      assert.ok(typeof value === 'string' && value.trim(), `${language}:${key}`);
      assert.deepEqual(value.match(/\{\w+\}/g), translations.en[key].match(/\{\w+\}/g), `${language}:${key}`);
      assert.ok(!value.includes('\uFFFD'), `${language}:${key}`);
    }
  }
});

test('event, rule and record content resolves in every language', () => {
  const keys = [...RULES, 'event.welcome', 'event.name', 'event.withheld', 'ending.exception'];
  for (const event of EVENTS) for (const effect of event.effects) if (effect.textKey) keys.push(effect.textKey);
  for (const record of RECORDS) {
    for (const field of ['title', 'size', 'footnote', ...Array.from({ length: record.lines }, (_, i) => i + 1)]) keys.push(`record.${record.id}.${field}`);
  }
  for (const language of LANGUAGES) for (const key of keys) assert.ok(translate(language, key, { name: 'אור 7' }));
});

test('Unicode typing keeps graphemes intact and RTL isolates technical content', () => {
  for (const language of LANGUAGES) {
    const welcome = translate(language, 'intro.welcome');
    assert.equal(graphemes(welcome, language).join(''), welcome);
  }
  assert.deepEqual(graphemes('שָׁ', 'he'), ['שָׁ']);
  assert.ok(translate('he', 'event.adminNotice').includes('\u2066ADMIN\u2069'));
  assert.ok(translate('he', 'event.trusted').includes('\u2066/page-7\u2069'));
  assert.ok(translate('he', 'event.name', { name: 'Alex 7' }).includes('\u2068Alex 7\u2069'));
  assert.match(translate('ru', 'exit.brokenOne', { numbers: '01' }), /правило 01/);
  assert.match(translate('ru', 'exit.brokenMany', { numbers: '01, 06' }), /правила 01, 06/);
});

test('UI components contain no hardcoded prose or translated attributes', () => {
  function visit(node, file) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXText') assert.ok(!/[A-Za-z\u0400-\u04ff\u0590-\u05ff]/u.test(node.value.replace('[ i ]', '')), `${file}: ${node.value}`);
    if (node.type === 'JSXAttribute' && ['aria-label', 'placeholder', 'alt', 'title'].includes(node.name.name)) assert.notEqual(node.value?.type, 'StringLiteral', `${file}: ${node.name.name}`);
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(child => visit(child, file)); else if (value && typeof value === 'object') visit(value, file);
  }
  for (const file of fs.readdirSync('src', { recursive: true }).filter(file => file.endsWith('.jsx') && !file.startsWith('translations'))) {
    visit(parse(fs.readFileSync(path.join('src', file), 'utf8'), { sourceType: 'module', plugins: ['jsx'] }), file);
  }
});
