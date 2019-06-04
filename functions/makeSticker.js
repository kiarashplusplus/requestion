'use strict';

const puppeteer = require('puppeteer');
const { template } = require('./template');

const makeSticker = async item => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  var screenshot = async item => {
    try {
      const page = await browser.newPage();
      await page.setContent(template(item), { waitUntil: 'networkidle2' });

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
exports.makeSticker = makeSticker;
