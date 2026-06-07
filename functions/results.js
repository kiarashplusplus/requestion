'use strict';

const https = require('https')
var _ = require('lodash');
const {getCache, setCache} = require('./utils');
const {getLocality} = require('./localities');

// Over-fetch: local outlets publish fewer image-bearing articles and the filter
// below drops imageless ones, so request a generous page and let the endpoint
// slice down to its display length.
const NEWS_PAGE_SIZE = 20;

const formatNewsAPI = data =>
  (data.status = !"ok" || !data.articles.length)
    ? []
    : _.chain(data.articles)
        .filter(item => item.urlToImage && item.title && item.description)
        .map(item => ({
          image: item.urlToImage,
          title: item.title,
          snippet: item.description,
          redirectUrl: item.url,
          source: item.source.name,
          type: "newsArticle"
        }))
        .value();

const getNewsApi = () => {
  const NewsAPI = require('newsapi');
  const KEY = process.env.NEWSAPI_ID;
  if (!KEY) {
    throw new Error('Missing the NEWSAPI_ID environment variable')
  }
  return new NewsAPI(KEY);
};

// Shared fetch path: serve from cache (unless `fresh`), otherwise hit NewsAPI's
// `everything` endpoint with the given params and cache the raw response.
// The cache key is locality-scoped by callers so localities never collide.
const fetchEverything = (params, cacheKey, fresh) =>
  getCache('newsAPI', cacheKey)
    .then(data => (data && !fresh) ? formatNewsAPI(data) :
      getNewsApi().v2.everything(params).then(response => {
        setCache('newsAPI', cacheKey, response);
        console.log('Hitting News API endpoint and results is', response);
        return formatNewsAPI(response);
      })
    );

// Topic search, optionally restricted to a locality's local-news domains.
// When `locality` is omitted the behavior is identical to before (global search).
exports.generateNewsResults = (query, fresh = false, locality = null) => {
  const loc = getLocality(locality);
  const params = {
    q: query,
    language: 'en',
    sortBy: 'relevancy',
    page: 1,
    pageSize: NEWS_PAGE_SIZE,
  };
  if (loc) params.domains = loc.domains.join(',');
  const cacheKey = (loc ? loc.id + ':' : '') + query;
  return fetchEverything(params, cacheKey, fresh);
};

// "Near you" headlines: latest articles from a locality's local-news domains,
// no query required. Returns [] for an unknown / missing locality.
exports.generateLocalHeadlines = (locality, fresh = false) => {
  const loc = getLocality(locality);
  if (!loc) return Promise.resolve([]);
  const params = {
    domains: loc.domains.join(','),
    language: 'en',
    sortBy: 'publishedAt',
    page: 1,
    pageSize: NEWS_PAGE_SIZE,
  };
  return fetchEverything(params, loc.id + ':__top__', fresh);
};

// Not used right now. The thumbnail quality is terrible.
const bingNewsSearch = query => {
    const KEY = process.env.AZURE_ID;
    if (!KEY) {
    throw new Error('Missing the AZURE_ID environment variable')
    }

    return getCache('bingNews', query)
    .then(data => data ? data :
        https.get({
            hostname: 'api.cognitive.microsoft.com',
            path:     '/bing/v7.0/news/search?q=' + encodeURIComponent(query),
            headers:  { 'Ocp-Apim-Subscription-Key': KEY},
        }, res => {
            let body = ''
            res.on('data', part => body += part)
            res.on('end', () => {
            const data = JSON.parse(body);
            setCache('bingNews', query, data);
            console.log('Hitting Bing API endpoint and results is', data);
            return data;
            })
            res.on('error', e => {
            console.log('Error: ' + e.message)
            throw e
            })
        })
    );
}
