'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { generateGoogleResults, makeSticker } = require('./makeSticker');
const { overlay, getCache, setCache } = require('./utils');
const { generateNewsResults } = require('./results');
var _ = require('lodash');

try {admin.initializeApp(functions.config().firebase);} catch (e) {}
var db = admin.firestore();

const beefyOpts = { memory: '2GB', timeoutSeconds: 180 };
const stickerUrl = 'https://requestionapp.firebaseapp.com/sticker?id=';
const maxQueryResponseLength = 10;
const newsKey = 'news';
const defaultNewsWidth = 300;
const defaultNewsHeight = 400;

const addStickerItem = async item =>
  db.collection('stickers').add({ input: item }).then(ref => ({
    imgSrc: stickerUrl + ref.id, 
    imgWidth: defaultNewsWidth, 
    imgHeight: defaultNewsHeight, 
    // key: item.type, 
    redirectUrl: item.redirectUrl
  }));

const addStickerImage = (image, meta='') =>
  db.collection('stickers').add({ image: image, meta: meta }).then(ref => ref.id);
  
// Initial user query
// Returns list of stickerIds and sizes to start rendering serp.
// Screenshot shouldn't block this function.
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
  const news = await generateNewsResults(q, wantsFresh);
  const newsStickers = await Promise.all(news).then(items => Promise.all(items.map(item => addStickerItem(item))));
  const newsSection = {news: {title: "News", stickers: newsStickers}};
  const sections = _.assign(cachedSections, newsSection);
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
          : makeSticker(sticker.input).then(buffer => {
              let encoded = 'data:image/png;base64,' + buffer;
              stickerRef.update({ image: encoded });
              res.json(buildResponse(encoded));
            });
      }
    })
    .catch(err => {
      console.log('Error connecting to database:', err);
      res.status(500).send(err);
    });
});

exports.overlay = functions.https.onRequest((req, res) => {
  const stickerId = req.query.id;
  overlay(stickerId).then(url => res.send(url));
})

exports.ping = functions.https.onRequest((req, res) => {
  res.send('ping');
});
