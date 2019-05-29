'use strict';

const Handlebars = require('handlebars');
const fs = require('fs');
require.extensions['.handlebars'] = function(module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};
Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});
const TEMPLATES = name => require('./templates/' + name + '.handlebars');
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
        image: item.cse_image
      };
      var result = template(data);
      break;
    default:
      var result = '';
  }

  return result;
};
