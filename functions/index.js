'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { makeSticker } = require('./makeSticker');
const { getCache, setCache } = require('./utils');
const { generateResults } = require('./results');

try {admin.initializeApp(functions.config().firebase);} catch (e) {}
var db = admin.firestore();

const beefyOpts = { memory: '2GB', timeoutSeconds: 60 };

const addStickerItem = async item =>
  db.collection('stickers').add({ input: item }).then(ref => ref.id);

// Initial user query
exports.query = functions.https.onRequest(async (request, response) => {
  const q = request.query.q;
  
  //TODO: Return sticker type along with stickerIds to help front-end group them
  getCache("query", q)
    .then(stickerIds =>
      stickerIds
        ? response.send(stickerIds)
        : generateResults(q)
            .then(items => Promise.all(items.map(item => addStickerItem(item))))
            .then(stickerIds => {
              console.log(stickerIds);
              setCache("query", q, stickerIds);
              return response.send(stickerIds);
            })
    )
    .catch(err => response.status(500).send(err));
});

// Get sticker by providing a stickerId
exports.sticker = functions.runWith(beefyOpts).https.onRequest((req, res) => {
  const stickerId = req.query.id;
  var stickerRef = db.collection('stickers').doc(stickerId);
  stickerRef.get()
    .then(doc => {
      if (!doc.exists) {
        res.status(404).send('Not a valid stickerId.');
      } else {
        const sticker = doc.data();
        sticker.image
          ? res.type('image/png').send(sticker.image)
          : makeSticker(sticker.input).then(buffer => {
              stickerRef.update({ image: buffer });
              res.type('image/png').send(buffer);
            });
      }
    })
    .catch(err => {
      console.log('Error connecting to database:', err);
      res.status(500).send(err);
    });
});

exports.ping = functions.https.onRequest((req, res) => {
  res.send('ping');
});
