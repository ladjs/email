const juice = require('juice');

// promise version of `juice.juiceResources`
const juiceResources = (html, options) => {
  return new Promise((resolve, reject) => {
    juice.juiceResources(html, options, (err, html) => {
      if (err) return reject(err);
      resolve(html);
    });
  });
};

module.exports = juiceResources;
