'use strict';

// Curated local-news source allow-lists. The allow-list IS the editorial point
// of view of the product: a search is answered only by these outlets for the
// chosen locality. Domains should be validated against NewsAPI at curation time
// (only ship domains that actually return image-bearing articles) — see the
// Risks / M0 section of docs/local-news-revival.md.
//
// Mechanism is NewsAPI `domains` (host allow-list) rather than `sources`,
// because most true local outlets are not first-class NewsAPI sources.
const LOCALITIES = {
  austin: {
    name: 'Austin, TX',
    domains: ['statesman.com', 'kut.org', 'austinmonitor.com', 'kvue.com'],
  },
  boston: {
    name: 'Boston, MA',
    domains: ['bostonglobe.com', 'wbur.org', 'universalhub.com', 'boston.com'],
  },
  sf: {
    name: 'San Francisco, CA',
    domains: ['sfchronicle.com', 'sfstandard.com', 'kqed.org', 'sfgate.com'],
  },
};

// Returns { id, name, domains } for a known locality id, or null otherwise.
const getLocality = id =>
  id && LOCALITIES[id] ? Object.assign({ id }, LOCALITIES[id]) : null;

// Public list for the client picker: [{ id, name }, ...].
const listLocalities = () =>
  Object.keys(LOCALITIES).map(id => ({ id, name: LOCALITIES[id].name }));

module.exports = { LOCALITIES, getLocality, listLocalities };
