const { promisify } = require('util');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const uuid = require('uuid');
const basicHtmlToText = require('html-to-text');
const opn = require('opn');
const _ = require('lodash');
const s = require('underscore.string');
const i18n = require('@ladjs/i18n');
const transports = require('./transports');
const { render, juiceResources } = require('./helpers');

class Script {
  constructor(config = {}, job, done) {
    if (!this.transports.indexOf(config.transport)) {
      throw new Error(
        `That transport isn't supported. Please choose one from ${this
          .transports}`
      );
    }

    this.transport = config.transport;

    if (
      !_.isString(job.attrs.data.template) ||
      s.isBlank(job.attrs.data.template)
    )
      return done(new Error('email `template` missing'));

    if (!_.isString(job.attrs.data.to) || s.isBlank(job.attrs.data.to)) {
      return done(new Error('email `to` missing'));
    }

    job.attrs.data = _.defaults(job.attrs.data, {
      ...config.email
    });
  }

  transports() {
    return Object.keys(transports);
  }

  async run() {
    const { env, job, locales, sendEmail, logger, transport, done } = this;

    try {
      // ensure there is a locals object for rendering
      if (!_.isObject(job.attrs.data.locals)) job.attrs.data.locals = {};

      // if there was a locale object passed
      if (
        _.isString(job.attrs.data.locals.locale) &&
        _.includes(locales, job.attrs.data.locals.locale)
      ) {
        i18n.setLocale(job.attrs.data.locals.locale);
      } else if (
        _.isObject(job.attrs.data.locals.user) &&
        _.isString(job.attrs.data.locals.user.last_locale) &&
        _.includes(locales, job.attrs.data.locals.user.last_locale)
      )
        // else if the locale was not explicitly set
        // then check if there was a user object
        i18n.setLocale(job.attrs.data.locals.user.last_locale);

      // set i18n in `job.attrs.data.locals`
      const locals = {
        ...job.attrs.data.locals,
        ...i18n.api
      };

      const subject = await render(
        `${job.attrs.data.template}/subject`,
        locals
      );

      const html = await render(`${job.attrs.data.template}/html`, {
        ...locals,
        subject
      });

      // transform the html with juice using remote paths
      // google now supports media queries
      // https://developers.google.com/gmail/design/reference/supported_css
      const inlineHtml = await juiceResources(html, {
        preserveImportant: true,
        webResources: {
          relativeTo: path.join(__dirname, '..', 'build')
        }
      });

      const transportOpts = {
        html: inlineHtml,
        subject,
        ..._.omit(job.attrs.data, ['locale', 'locals', 'template'])
      };

      // if we're in development mode then render email template for browser
      if (env === 'development') {
        const tmpHtmlPath = `${os.tmpdir()}/${uuid.v4()}.html`;
        const tmpTextPath = `${os.tmpdir()}/${uuid.v4()}.txt`;

        await promisify(fs.writeFile).bind(fs)(tmpHtmlPath, inlineHtml);
        await promisify(fs.writeFile).bind(fs)(
          tmpTextPath,
          basicHtmlToText.fromString(inlineHtml, {
            ignoreImage: true
          })
        );

        await opn(tmpHtmlPath, { wait: false });
      }

      if (!sendEmail) {
        logger.info('Email sending has been disabled');
        return done();
      }

      const res = await transport.sendMail(transportOpts);

      logger.info('email sent', { extra: res });

      done();
    } catch (err) {
      done(err);
    }
  }
}

module.exports = Script;
