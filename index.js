const transports = require('./transports');

class Script {
  constructor(config = {}) {
    if (!this.transports.indexOf(config.transport)) {
      throw new Error(`That transport isn't supported. Please choose one from ${this.transports}`);
    }

    this.transport = config.transport;
  }
  transports() {
    return Object.keys(transports);
  }
}

module.exports = Script;
