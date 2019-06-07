'use strict';

const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhonex = devices['iPhone X'];
const { template } = require('./template');
var _ = require('lodash');
var util = require('util')

exports.makeSticker = async item => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  var screenshot = async item => {
    try {
      const page = await browser.newPage();
      await page.setContent(template(item));

      const rect = await page.evaluate(() => {
        const element = document.querySelector('#shoot');
        if (!element) return null;
        const { x, y, width, height } = element.getBoundingClientRect();
        return { left: x, top: y, width, height, id: element.id };
      });
      const padding = 0;
      const buffer = await page.screenshot({
        type: 'png',
        omitBackground: true,
        encoding: 'base64',
        clip: {
          x: rect.left - padding,
          y: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2
        }
      });
      return buffer;
    } catch (e) {
      return null;
    }
  };
  //await browser.close();
  return screenshot(item);
};

const googleStickers = async query => {
  const browser = await puppeteer.launch();
  console.log("launched pup!");
  try {
    const page = await browser.newPage();
    console.log("before emulate");
    await page.emulate(iPhonex);
    console.log("after emulate");
    await page.goto('https://www.google.com/search?q='+encodeURIComponent(query));
    const rectList = await page.evaluate(() => 
      Array.from(document.querySelectorAll('.srg')).map(element => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { left: x, top: y, width, height, id: element.id };
      })
    );
    return Promise.all(_.map(rectList, async rect => {
      const image = await page.screenshot({
          type: 'png',
          encoding: 'base64',
          omitBackground: true,
          clip: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          }
        });
      return {rect: rect, image: image};
    }));
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
