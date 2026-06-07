'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { templatePage, alternativePages } = require('../template');

const newsItem = {
  type: 'newsArticle',
  title: 'Local Reservoir Reaches Record High',
  snippet: 'After weeks of rain, the reservoir is full for the first time in years.',
  image: 'https://example.com/img.jpg',
  source: 'Austin Monitor',
};

test('templatePage renders a newsArticle into HTML containing its data', () => {
  const html = templatePage(newsItem);
  assert.strictEqual(typeof html, 'string');
  assert.ok(html.length > 0);
  assert.ok(html.includes(newsItem.title), 'rendered HTML should contain the title');
  assert.ok(html.includes(newsItem.source), 'rendered HTML should contain the source');
});

test('templatePage returns empty string for unknown sticker types', () => {
  assert.strictEqual(templatePage({ type: 'somethingElse' }), '');
});

test('alternativePages returns a non-empty array of rendered pages for newsArticle', () => {
  const pages = alternativePages('newsArticle', {
    title: newsItem.title,
    snippet: newsItem.snippet,
    image: newsItem.image,
  });
  assert.ok(Array.isArray(pages));
  assert.ok(pages.length > 0, 'should render the newsArticle_*.handlebars variants');
  for (const page of pages) {
    assert.strictEqual(typeof page, 'string');
    assert.ok(page.length > 0);
  }
});

test('alternativePages returns [] for types without alternative templates', () => {
  assert.deepStrictEqual(alternativePages('somethingElse', {}), []);
});
