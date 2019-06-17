'use strict';

const https = require('https')
const functions = require('firebase-functions');
var _ = require('lodash');
const {getCache, setCache} = require('./utils');


// In development only
process.on('uncaughtException', function (err) {
    console.log(err);
}); 

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

exports.generateNewsResults = (query, fresh=false) => {
    const NewsAPI = require('newsapi');
    const KEY = functions.config().newsapi.id;
    if (!KEY) {
        throw new Error('Missing the NEWS_API environment variable')
    }
    const newsapi = new NewsAPI(KEY);
    return getCache('newsAPI', query)
    .then(data => (data && !fresh) ? formatNewsAPI(data) :
        newsapi.v2.everything({
            q: query,
            language: 'en',
            sortBy: 'relevancy',
            page: 1
            }).then(response => {
                setCache('newsAPI', query, response);
                console.log('Hitting News API endpoint and results is', response);
                return formatNewsAPI(response);
            })
    );
};

// Not used right now. The thumbnail quality is terrible.
const bingNewsSearch = query => {
    const KEY = functions.config().azure.id;
    if (!KEY) {
    throw new Error('Missing the AZURE_SUBSCRIPTION_KEY environment variable')
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
