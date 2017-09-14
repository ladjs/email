const transports = require('./transports');

class Script {
  constructor(config) {
    config = Object.assign({}, config);
    this._name = config.name || 'script';
  }
  transports() {
    return Object.keys(transports);
  }
}

module.exports = Script;
