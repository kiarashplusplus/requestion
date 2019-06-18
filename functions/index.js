'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { generateAlternatives, generateGoogleResults, makeSticker } = require('./makeSticker');
const { addStickerItem, addStickerImage, overlay, getCache, setCache } = require('./utils');
const { generateNewsResults } = require('./results');
const requestIp = require('request-ip');
const _ = require('lodash');

try {admin.initializeApp(functions.config().firebase);} catch (e) {}
var db = admin.firestore();

const beefyOpts = { memory: '2GB', timeoutSeconds: 180 };
const stickerUrl = 'https://requestion.app/sticker?id=';
const maxQueryResponseLength = 10;
const maxNewsResponseLength = 4;

// Initial user query
// Returns a list of Sections with stickers to start rendering Serp in app.
// No blocking Screenshot events.
exports.query = functions.https.onRequest(async (request, response) => {
  const q = request.query.q;
  const wantsFresh = request.query.fresh ? true : false;
  console.log(`Endpoint query: ${q}`);

  const buildResponse = sections => ({
    query: q,
    sections: sections
  });
  const cachedSections = await getCache("query", q);
  if (cachedSections && !wantsFresh) {
    response.json(buildResponse(cachedSections))
  }
  var news = await generateNewsResults(q, wantsFresh);
  news = news.slice(0, maxNewsResponseLength);
  const newsStickers = await Promise.all(news).then(items => Promise.all(items.map(item => addStickerItem(item))));
  const newsSection = {news: {title: "News", data: newsStickers}};
  const sections = _.merge(cachedSections, newsSection);
  setCache("query", q, sections);
  response.json(buildResponse(sections));
});

// Different from /query because screenshot happens during the initial query
// Rendering on Serp outside of the intial view.
exports.google = functions.runWith(beefyOpts).https.onRequest(async (request, response) => {
    const q = request.query.q;
    console.log(`Endpoint google: ${q}`);

    const buildResponse = stickers => ({
      query: q,
      stickers: _.map(stickers.slice(0, maxQueryResponseLength), sticker => ({
        image: stickerUrl + sticker.id,
        height: sticker.height,
        width: sticker.width
      }))
    });

    getCache("google", q)
      .then(results =>
        results
          ? response.json(buildResponse(results))
          : generateGoogleResults(q)
              .then(items =>
                  items.map(async item => {
                    const id = await addStickerImage(item.image, item.meta);
                    return {
                    id: id,
                    width: item.meta.width,
                    height: item.meta.height
                  }})
              )
              .then(async stickers => {
                const results = await Promise.all(stickers);
                console.log(results);
                setCache("google", q, results);
                return response.json(buildResponse(results));
              })
      )
      .catch(err => response.status(500).send(err));
  });

// Get sticker by providing a stickerId
exports.sticker = functions.runWith(beefyOpts).https.onRequest((req, res) => {
  const stickerId = req.query.id;
  if (!stickerId) return res.status(404).send('Not a valid stickerId.');
  const buildResponse = b64 => ({
    stickerId: stickerId,
    image: b64
  })
  const wantsHtml = req.query.html ? true : false;
  const cachedSticker = image => wantsHtml 
    ? res.send(`<div><img src="${image}" /></div>`) 
    : res.json(buildResponse(image))

  var stickerRef = db.collection('stickers').doc(stickerId);
  stickerRef.get()
    .then(doc => {
      if (!doc.exists) {
        res.status(404).send('Not a valid stickerId.');
      } else {
        const sticker = doc.data();
        sticker.image
          ? cachedSticker(sticker.image)
          : makeSticker(sticker.input).then(result => {
              if (result) {
                stickerRef.update(result);
                res.json(buildResponse(result.image));
              } else {
                res.json(buildResponse(''));
              }
            });
      }
    })
    .catch(err => {
      console.log('Error connecting to database:', err);
      res.status(500).send(err);
    });
});

// Database Trigger
exports.createAlternatives = functions.runWith(beefyOpts).firestore
  .document('stickers/{stickerId}')
  .onCreate(async (doc, context) => {
    const sticker = doc.data();
    if (!sticker.alternatives && !sticker.isBuildingAlternatives) {
        await generateAlternatives(sticker.type, sticker.input, doc.ref);
    }
  });
  
  // First checks for existing `alternatives` feild in sticker, or waits if `isBuildingAlternatives` 
  // is in an `inProgress` state. Otherwise, generates alternatives and returns them.
  exports.alternatives = functions.runWith(beefyOpts).https.onRequest((req, res) => {
    const stickerId = req.query.id;
    if (!stickerId) return res.status(404).send('Not a valid stickerId.');
    const buildResponse = stickers => ({
      original: stickerUrl + stickerId,
      stickers: stickers
    });
    var stickerRef = db.collection('stickers').doc(stickerId);
    let observer = stickerRef.onSnapshot(
      async doc => {
        try {
          if (!doc.exists) return res.status(404).send('Not a valid stickerId.');
          const sticker = doc.data();
          if (sticker.alternatives) {
            return res.json(buildResponse(sticker.alternatives));
          } else if (!sticker.isBuildingAlternatives) {
            // Build and return it
            const alternatives = await generateAlternatives(sticker.type, sticker.input, stickerRef);
            return res.json(buildResponse(alternatives));
          } else if (sticker.isBuildingAlternatives != 'inProgress') {
            return res.json(buildResponse(null));
          }
        } catch (e) {
          observer(); //supposed to stop listening
          console.log('alternatives endpoint error', e);
        }
      },
      err => {
        console.log(`Encountered error: ${err}`);
      }
    );
  });

exports.overlay = functions.https.onRequest((req, res) => {
  const stickerId = req.query.id;
  overlay(stickerId).then(url => res.send(url));
})

exports.featured = functions.https.onRequest((req, res) => {
  console.log(req.connection.remoteAddress);
  const clientIp = requestIp.getClientIp(req); 
  console.log(clientIp);
  console.log(req.headers["x-forwarded-for"]);
  res.json([
    {
      "query": "2019 Women's World Cup",
      "imgWidth": 949,
      "imgSrc": "https://requestion.app/sticker/?id=fifa",
      "imgHeight": 374
    }
  ]);
});


exports.ping = functions.https.onRequest((req, res) => {
  res.send('ping');
});
