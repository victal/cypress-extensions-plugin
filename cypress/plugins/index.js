const path = require('path');
const extensionLoader = require('../../loader');

module.exports = (on, config) => {
  on('before:browser:launch', (browser = {}, launchOptions) => (
    extensionLoader.load(
      path.join(config.fixturesFolder, 'unpacked'), {
        source: path.join(config.fixturesFolder, 'unpacked'),
        alias: 'unpacked1',
      }, {
        source: path.join(config.fixturesFolder, 'unpacked2'),
        alias: 'unpacked2',
      }, {
        source: path.join(config.fixturesFolder, 'unpacked'),
        alias: 'hookless',
        skipHooks: true,
      }, {
        source: path.join(config.fixturesFolder, 'crxpacked.crx'),
        alias: 'crxpacked',
      }, {
        source: path.join(config.fixturesFolder, 'manifestv3'),
        alias: 'manifestv3-chrome',
        validBrowsers: ['chrome'],
        manifest: 'manifest-chrome.json'
      }, {
        source: path.join(config.fixturesFolder, 'manifestv3'),
        alias: 'manifestv3-firefox',
        validBrowsers: ['firefox'],
        manifest: 'manifest-firefox.json'
      }
    )(browser, launchOptions)
  ));
};
