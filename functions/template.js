'use strict';

const fs = require('fs');
const Handlebars = require('handlebars');

require.extensions['.handlebars'] = (module, filename) =>
  module.exports = fs.readFileSync(filename, 'utf8');
  
const TEMPLATES = name => require('./templates/' + name + '.handlebars');
Handlebars.registerHelper('ifEquals', (arg1, arg2, options) => 
  arg1 == arg2 ? options.fn(this) : options.inverse(this));
Handlebars.registerPartial('head', TEMPLATES('head'));
Handlebars.registerPartial('defaultMui', TEMPLATES('defaultMui'));

exports.template = item => {
  switch (item.type) {
    case 'news_article':
      var source = TEMPLATES('newsArticle');
      var template = Handlebars.compile(source);
      var data = {
        mui: 'default',
        title: item.title,
        snippet: item.snippet,
        image: item.image
      };
      var result = template(data);
      break;
    default:
      var result = '';
  }

  return result;
};
