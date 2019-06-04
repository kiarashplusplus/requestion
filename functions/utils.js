'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');
try {admin.initializeApp(functions.config().firebase);} catch (e) {}
var db = admin.firestore();

var cloudinary = require('cloudinary').v2
const KEY = functions.config().cloudinary.key;
if (!KEY) {
  throw new Error('Missing the Cloudinary environment variable')
}
cloudinary.config({ 
  cloud_name: 'kiarash', 
  api_key: functions.config().cloudinary.key, 
  api_secret: functions.config().cloudinary.secret
});
const util = require('util');
const uploader = util.promisify(cloudinary.uploader.upload);
const REQUESTION_HOST = 'https://requestionapp.firebaseapp.com';

const uploadSticker = async stickerId => {
  const upload = uploader(`${REQUESTION_HOST}/sticker/?id=${stickerId}`, {
    tags: "sticker_upload"
  });
  return upload.then(image => ({
    publicId: image.public_id,
    url: image.url,
    width: image.width,
    height: image.height
  }));
};

const getCache = async (kind, key) =>
  db.collection("cache").doc(kind + ":" + key).get()
    .then(doc => (!doc.exists ? null : doc.data().data));

const setCache = async (kind, key, value) =>
  db.collection('cache').doc(kind + ":" + key).set({ data: value });

exports.overlay = (stickerId, base = 'v1559249853/base0.jpg') => {
  if (!stickerId) return null;
  const publicId = getCache("cloudinary", stickerId).then(info =>
    info
      ? info.publicId
      : uploadSticker(stickerId)
          .then(info => {
            setCache("cloudinary", stickerId, info);
            return info.publicId;
          })
          .catch(err => {
            console.log("Error uploading image to Cloudinary: ", err);
            return null;
          })
  );
  return publicId.then(id => 
    `https://res.cloudinary.com/kiarash/image/upload/c_scale,h_230,l_${id},r_0/${base}`
    );
}

exports.getCache = getCache;
exports.setCache = setCache;