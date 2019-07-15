This repo hosts the server side Firebase Functions and the static website content.

The server endpoints are implemented in functions/index.js. 

Sticker making happens by opening the content in [Puppeteer](https://github.com/GoogleChrome/puppeteer), a headless Chrome and taking a screenshot. Most of this logic is in functions/makeSticker.js and templates are in functions/templates/.

Specially during initial user testing, sometimes we want to upload a set of static images as stickers for a query. This is done using Python/cached_query_from_static.py.

/featured returns topic queries that we're currently user testing. (i.e. `2019 Women's World Cup`)
/query returns at least one type of results (i.e. `newsArticle`) for any query.
/sticker returns a sticker via stickerId.
/alternatives returns alternative designs of a certain stickerId.

TODO:
* extend `template.js` with more types
