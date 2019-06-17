'use strict';

const functions = require('firebase-functions');
const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhonex = devices['iPhone X'];
const { alternativePages, templatePage } = require('./template');
const { addStickerImage } = require('./utils');
const _ = require('lodash');

const typesWithAlternatives = ['newsArticle'];
const stickerUrl = 'https://requestion.app/sticker?id=';
let browser;

const getBrowser = async () => {
  if (browser) return browser;
  const wsChromeEndpointurl = functions.config().chromeWS;
  if (wsChromeEndpointurl) {
    return await puppeteer.connect({
      browserWSEndpoint: wsChromeEndpointurl
    });
  } else {
    console.log('getBrowser: Launching a new browser');
    const puppeteerLaunchArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
    return await puppeteer.launch({ args: puppeteerLaunchArgs });
  }
};

const shootPageEvaluator = () => {
  const element = document.querySelector('#shoot');
  if (!element) return null;
  const { x, y, width, height } = element.getBoundingClientRect();
  return { left: x, top: y, width, height, id: element.id };
}

const screenshot = async (pageContent, pageEvaluator=shootPageEvaluator)  => {
  browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(pageContent);
    const rect = await page.evaluate(pageEvaluator);
    if (!rect) return null;
    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: true,
      encoding: 'base64',
      clip: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      }
    });    
    return {
      image: "data:image/png;base64," + buffer,
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  } catch (e) {
    console.log(e);
    return null;
  }
};

exports.makeSticker = async item => {
  return screenshot(templatePage(item));
};

// Not in production. Only works while running with `firebase serve`. 
const googleStickers = async query => {
  const browser = await puppeteer.launch();
  console.log("launched pup!");
  try {
    const page = await browser.newPage();
    await page.emulate(iPhonex);
    await page.goto('https://www.google.com/search?q=' + encodeURIComponent(query));

    // const rectList = await page.evaluate(() =>
    //   Array.from(document.querySelectorAll("[class*='wholepage-card'],.srg,.imso-hov,g-inner-card")).map(element => {
    //     const { x, y, width, height } = element.getBoundingClientRect();
    //     return { left: x, top: y, width, height, id: element.id };
    //   })
    // );
    // debug:
    var rectList = [{left:0, top:0, width:370, height:650}];
    return Promise.all(
      _.chain(rectList)
        .filter(rect => rect.height > 100)
        .map(async rect => {
          const image = await page.screenshot({
            type: "png",
            encoding: "base64",
            omitBackground: true,
            clip: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            }
          });
          return { rect: rect, image: image };
        })
        .value()
    );
  } catch (e) {
    console.log(e);
    return null;
  }
  //await browser.close();
};


exports.generateGoogleResults = query => {
  console.log("generateGooglgeResults");
  return googleStickers(query).then(response => _.map(response, image => ({image: 'data:image/png;base64,' + image.image, meta: image.rect})));
};

exports.generateAlternatives = async (stickerType, stickerInput, stickerRef) => {
  if (stickerType && typesWithAlternatives.indexOf(stickerType) > -1) {
    return stickerRef.update({ isBuildingAlternatives: 'inProgress' }).then(async () => {
      const pages = alternativePages(stickerType, stickerInput);
      const alternatives = Promise.all(_.map(pages, async pageContent => {
        var {image, width, height} = await screenshot(pageContent);
        var result = {imgWidth: width, imgHeight: height};
        result.imgSrc = stickerUrl + await addStickerImage(image, 'alternative');
        return result;
      }));
      return alternatives.then(content => {
        content.length
        ? stickerRef.update({
            alternatives: content,
            isBuildingAlternatives: "finished"
          })
        : stickerRef.update({
            isBuildingAlternatives: "noneCreated"
          });
        return content;
      });
   });
  } else {
      stickerRef.update({
        isBuildingAlternatives: 'noneCreated'
      });
      return null;
  }
};