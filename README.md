This repo hosts the server side [Firebase Functions](https://firebase.google.com/docs/functions) and the public website content.

Sticker making happens by opening html templates in [Puppeteer](https://github.com/GoogleChrome/puppeteer), a headless Chrome and taking a screenshot. Most of this logic is in [functions/makeSticker.js](functions/makeSticker.js) and templates are in [functions/templates](functions/templates).

Specially during initial user testing, sometimes we want to upload a set of static images as stickers for a query. This is done using [Python/cached_query_from_static.py](Python/cached_query_from_static.py).

The server endpoints are implemented in [functions/index.js](functions/index.js):
- /featured returns topic queries that we're currently user testing. (i.e. `2019 Women's World Cup`)
- /query returns at least one type of results (i.e. `newsArticle`) for any query.
- /sticker returns a base64 sticker image via stickerId.
- /alternatives returns alternative designs of a certain sticker.

TODO:
* extend `template.js` with more types
