'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');
try {admin.initializeApp(functions.config().firebase);} catch (e) {}
var db = admin.firestore();

exports.getCache = async (kind, key) =>
  db.collection("cache").doc(kind + ":" + key).get()
    .then(doc => (!doc.exists ? null : doc.data().data));

exports.setCache = async (kind, key, value) =>
  db.collection('cache').doc(kind + ":" + key).set({ data: value });