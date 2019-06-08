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

const addStickerItem = async item =>
  db.collection('stickers').add({ input: item }).then(ref => ref.id);

const addStickerImage = (image, meta='') =>
  db.collection('stickers').add({ image: image, meta: meta }).then(ref => ref.id);
  
// Initial user query
// Returns list of stickerIds and sizes to start rendering serp.
// Screenshot shouldn't block this function.
exports.query = functions.https.onRequest(async (request, response) => {
  const q = request.query.q;
  console.log(`Endpoint query: ${q}`);

  // Need to know sticker size before building it.
  const buildResponse = stickerIds => ({
    query: q,
    stickers: _.map(stickerIds.slice(0, maxQueryResponseLength), id => ({
      image: stickerUrl + id,
      height: 304,
      width: 554
    }))
  });
  
  getCache("query", q)
    .then(stickerIds =>
      stickerIds
        ? response.json(buildResponse(stickerIds))
        : generateNewsResults(q)
        .then(items => Promise.all(items.map(item => addStickerItem(item))))
        .then(stickerIds => {
          console.log(stickerIds);
          setCache("query", q, stickerIds);
          return response.json(buildResponse(stickerIds));
          })
    )
    .catch(err => response.status(500).send(err));
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
