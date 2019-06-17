'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const cloudinary = require('cloudinary').v2;
const util = require('util');

try {admin.initializeApp(functions.config().firebase);} catch (e) {}
var db = admin.firestore();

let cloudinaryUploader;
const REQUESTION_HOST = 'https://requestion.app';
const stickerUrl = 'https://requestion.app/sticker?id=';
const defaultNewsWidth = 552;
const defaultNewsHeight = 340;

const getCache = async (kind, key) =>
  db.collection("cache").doc(kind + ":" + key).get()
    .then(doc => (!doc.exists ? null : doc.data().data));

const setCache = async (kind, key, value) =>
  db.collection('cache').doc(kind + ":" + key).set({ data: value });

exports.getCache = getCache;
exports.setCache = setCache;

exports.addStickerItem = async item =>
  db.collection("stickers")
    .add({ input: item, type: item.type, redirectUrl: item.redirectUrl })
    .then(ref => ({
      imgSrc: stickerUrl + ref.id,
      imgWidth: defaultNewsWidth,
      imgHeight: defaultNewsHeight,
      redirectUrl: item.redirectUrl,
      source: item.source,
    }));

exports.addStickerImage = (image, type) =>
  db.collection('stickers').add({ image: image, type: type }).then(ref => ref.id);

const getUploader = () => {
  if (cloudinaryUploader) return cloudinaryUploader;
  const KEY = functions.config().cloudinary.key;
  if (!KEY) {
    throw new Error('Missing the Cloudinary environment variable')
  }
  cloudinary.config({ 
    cloud_name: 'kiarash', 
    api_key: functions.config().cloudinary.key, 
    api_secret: functions.config().cloudinary.secret
  });
  return util.promisify(cloudinary.uploader.upload);
};

// TODO: update for base64 images.
const uploadSticker = async stickerId => {
  cloudinaryUploader = getUploader();
  const upload = cloudinaryUploader(`${REQUESTION_HOST}/sticker/?id=${stickerId}`, {
    tags: "sticker_upload"
  });
  return upload.then(image => ({
    publicId: image.public_id,
    url: image.url,
    width: image.width,
    height: image.height
  }));
};

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

