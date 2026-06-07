'use strict';

const { globSync } = require("glob");
const fs = require('fs');
const Handlebars = require('handlebars');
const _ = require('lodash');

require.extensions['.handlebars'] = (module, filename) =>
  module.exports = fs.readFileSync(filename, 'utf8');
  
const TEMPLATES = name => require('./templates/' + name + '.handlebars');
Handlebars.registerHelper('ifEquals', (arg1, arg2, options) => 
  arg1 == arg2 ? options.fn(this) : options.inverse(this));
Handlebars.registerPartial('head', TEMPLATES('head'));
Handlebars.registerPartial('defaultMui', TEMPLATES('defaultMui'));

exports.templatePage = item => {
  switch (item.type) {
    case 'newsArticle':
      var source = TEMPLATES('newsArticle');
      var template = Handlebars.compile(source);
      var data = {
        mui: 'default',
        title: item.title,
        snippet: item.snippet,
        image: item.image,
        source: item.source,
      };
      var result = template(data);
      break;
    default:
      var result = '';
  }

  return result;
};

exports.alternativePages = (stickerType, stickerInput) => {
  let pages;
  switch (stickerType) {
    case 'newsArticle':
      // Scope the glob to this module's templates dir (not the process cwd) and
      // return bare filenames, so the relative require below is stable across
      // glob versions (glob v9+ no longer preserves a leading "./").
      const files = globSync(stickerType + '_*.handlebars', {
        cwd: require('path').join(__dirname, 'templates')
      });
      pages = _.map(files, file => {
        const source = require('./templates/' + file);
        var template = Handlebars.compile(source);
        var data = {
          title: stickerInput.title,
          snippet: stickerInput.snippet,
          image: stickerInput.image
        };
        return template(data);
      });
      break;
    default:
      pages = [];
  }
  return pages;
}