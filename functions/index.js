'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { makeSticker } = require('./makeSticker');
const { overlay, getCache, setCache } = require('./utils');
const { generateResults } = require('./results');
var _ = require('lodash');
var glob = require("glob")

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

// Get a list of alternative stickers for a `stickerid`
exports.alternatives = functions.https.onRequest((req, res) => {
  const stickerId = req.query.id;
  var stickerRef = db.collection('stickers').doc(stickerId);
  stickerRef.get()
    .then(doc => {
      if (!doc.exists) {
        res.status(404).send('Not a valid stickerId.');
      } else {
        const sticker = doc.data();
        // `alternatives` is an array field in `sticker` document
        sticker.alternatives
          ? res.send(sticker.alternatives)
          : {
        
          }
      }
    })
    .catch(err => {
      console.log('Error connecting to database:', err);
      res.status(500).send(err);
    });

  var type = 'newsArticle';

  let files = glob.sync('./templates/'+type+'_*.handlebars'); //["./templates/newsArticle_v2.handlebars"]
  res.send(files);

        
          // const items = 
          // generateResults(q)
          // .then(items => Promise.all(items.map(item => addStickerItem(item))))
          // .then(stickerIds => {
          //   console.log(stickerIds);
          //   setCache("query", q, stickerIds);
          //   return response.send(stickerIds);
          // })
          //   // for each number in valid range create 
          //   alternativeInput = Object.assign({}, sticker.input);
          //   alternativeInput.type = alternativeInput.type + 'v' + v;
            
    
          //   // based on `type` create new sticker items with `type_v2'. This way templating 
          //   // method considers this a new type.
        
          //   // alternatives field which is a list of stickerIds. 
        
          // } 
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

exports.overlay = functions.https.onRequest((req, res) => {
  const stickerId = req.query.id;
  overlay(stickerId).then(url => res.send(url));
})

exports.ping = functions.https.onRequest((req, res) => {
  res.send('ping');
});
