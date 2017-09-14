const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

// TODO: this should be a package or we should use one that does same thing
// taken from:
// <https://github.com/queckezz/koa-views/blob/master/src/index.js>
function getPaths(abs, rel, ext) {
  return fs
    .stat(path.join(abs, rel))
    .then(stats => {
      if (stats.isDirectory()) {
        // a directory
        return {
          rel: path.join(rel, `index.${ext}`),
          ext
        };
      }
      // a file
      return { rel, ext: path.extname(rel).slice(1) };
    })
    .catch(err => {
      // not a valid file/directory
      if (!path.extname(rel) || path.extname(rel).slice(1) !== ext) {
        // Template file has been provided without the right extension
        // so append to it to try another lookup
        return getPaths(abs, `${rel}.${ext}`, ext);
      }
      throw err;
    });
}

// promise version of consolidate's render
// inspired by koa-views and re-uses the same config
// <https://github.com/queckezz/koa-views>
const render = (config, view, locals) => {
  const { map, engineSource, extension } = config.views.options;

  locals = _.extend(config.views.locals, locals);

  return new Promise(async (resolve, reject) => {
    try {
      const paths = await getPaths(root, view, extension);
      const filePath = path.resolve(root, paths.rel);
      const suffix = paths.ext;
      if (suffix === 'html' && !map) {
        const res = await fs.readFile(filePath, 'utf8');
        resolve(res);
      } else {
        const engineName = map && map[suffix] ? map[suffix] : suffix;
        const render = engineSource[engineName];
        if (!engineName || !render)
          return reject(
            new Error(`Engine not found for the ".${suffix}" file extension`)
          );
        // TODO: convert this to a promise based version
        render(filePath, locals, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      }
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = render;
