# Test a Web extension with Cypress

This Cypress plugin provides a few helpers to help you test your browser extension without messing with its code just for testing.

# ⚠WARNING⚠

This plugin is being updated in order to satisfy a specific use case for the current developer.
As such, this is not guaranteed to work with:
 - Cypress versions other than the version currently listed as a dependency in package.json
 - Browsers other than the latest Chrome or Firefox
 - Use cases beyond what's currently implemented

Further maintenance in this project is also not to be expected.

## Installation

```
npm install --save-dev @victal/cypress-extensions-plugin
```

## Regular Usage

In your project's [plugins file](https://on.cypress.io/guides/guides/plugins.html):

```javascript
// cypress/plugins/index.js
const extensionLoader = require('@victal/cypress-extensions-plugin/loader');

module.exports = (on) => {
  on('before:browser:launch', extensionLoader.load('/path/to/your/extension'));
}

// cypress/support/command.js
const addExtensionCommands = require('@victal/cypress-extensions-plugin/commands');
addExtensionCommands(Cypress);

// cypress/integration/my_spec.cy.js or cypress/support/index.js
beforeEach(() => {
  cy.clearExtensionStorage('local');
});
```

That's all you need to load a single extension and reset its storage on each test. Read further for more.

### Barebone usage (skip hooks)

Use this if you don't need Cypress to send commands to your Browser API (e.g. no local storage to reset):

```javascript
const loadExtension = require('@victal/cypress-extensions-plugin/loader').load;

on('before:browser:launch', loadExtension({
  source: '/path/to/myext',
  skipHooks: true,
}));
```

### Advanced usage:

You can pass options to the loader (here with their default value, unless required or stated otherwise):

```javascript
// or with more config
on('before:browser:launch', extensionLoader.load({
  source: '/path/to/extension', // path to the dir (unpacked) or crx extension, required
  alias: 'myExtension',         // identifier for use in tests if multiple extensions
  skipHooks: false              // don't inject content/background hook scripts, more secure and less intrusive but you can't use helpers/commands, set it to true if you don't need them
  watch: true,                  // rebuilds the temp dir extension on source files changes, useful on exts implementing live reload
  validBrowser: ['chrome'],     // valid browser names to load the extension to, null for all
  quiet: false,                 // disables loader console logs when set to true
  destDir: '/tmp/dir/my/ext'    // where your ext will be copied, modified and loaded into the browser, defaults to ${os.tmpdir()}/${alias}
  cypressMatches: ['*://*/*/integration/*'] // identifies Cypress frames by URL to prevent your extension loading in those, set it if your test dir is not cypress/integration/, must be an array
}))
```

You can also define several extensions, in which case you'll need to give them an alias to tell which one should receive each command in the helpers:

```javascript
on('before:browser:launch', (browser = {}, args) => {
  return extensionLoader.load(
    '/path/to/ext1', // alias defaults to "myExtension"
    // all exts need their own alias (at most one can have the default alias)
    { source: '/path/to/ext2', alias: 'ext2' }, 
    { source: '/path/to/ext3', alias: 'ext3' },
  )(browser, args);
});
```

A few convenience commands are provided for storage management:

```javascript
const addExtensionCommands = require('@victal/cypress-extensions-plugin/commands');
addExtensionCommands(Cypress) // options is optional, more below

// in spec/beforeEach hooks
cy.clearExtensionStorage(type);        // clear `type` storage ('local', 'sync' or 'managed')
cy.setExtensionStorage(type, obj);     // => chrome.storage[type].set(obj)
cy.getExtensionStorage(type, [k1,k2]); // => chrome.storage[type].get([k1,k2])
  .should('deep.eq', obj)     // Cypress chaining works
```

If you really(?) need more, the `execExtensionCommand` command gives you access to the wider browser extension API (`chrome` object properties and their methods) from Cypress, with a few caveats:

1. you can only pass JSONifiable args, no function (because they'll go through `window.postMessage` and `runtime.sendMessage`), so event listeners are not supported
2. your args must be passed as a `[arg1, arg2, ...]` array, single args as `[arg]` (don't forget the wrapping array)

```javascript
// generic command: `cy.execExtensionCommand(property, method, args, options)`
cy.execExtensionCommand('runtime', 'sendMessage', [msg]) // => `chrome.runtime.sendMessage(message)`
  .execExtensionCommand('storage.local', 'set', [obj]);  // properties can be chained with a dotted name
  .execExtensionCommand('tabs.TAB_ID_NONE').then((idNone) => /*.*/);  // accessing a property, we don't pass a method or args arg => `chrome.tabs.TAB_ID_NONE`
  // if `method` is not set (accessing property), the plugin assumes returnType is 'sync'
```

Each command can be passed custom options:

```javascript
cy.execExtensionCommand('runtime', 'postMessage', [msg], {
  alias: 'myOtherExtension',  // send command to a specific extension loaded with a custom alias, useful when testing 2+ extensions
  debug: true,                // spam the JS console with debug messages to debug issues, default false
  timeout: 5000,              // ms waiting for commands to extension backend to reply, default 2000
  returnType: 'sync'          // tell the backend to expect a sync response from the method, rather than pass it a callback (default 'callback')
}).then(/*.*/);
```

You can set default options for all subsequent commands with a context config:

```javascript
require('@victal/cypress-extensions-plugin/commands')(Cypress)({
  alias: 'myOtherExtension', // send commands to specific extension loaded with custom alias
  debug: true,               // log extension command stuff to console by default
  timeout: 5000,             // change default timeout for extension commands
})
```

If you don't want to pollute your Cypress namespace or log with commands, you can get a simple helper object, which works the same as the commands without the Cypress command/log sugar. All the helpers just return a promise:

```javascript
const myExt = require('@victal/cypress-extensions-plugin/helpers')(options); // options is optional

myExt.clearExtensionStorage(type)        // clear `type` storage ('local', 'sync' or 'managed')
myExt.setExtensionStorage(type, obj)     // => chrome.storage[type].set(obj)
myExt.getExtensionStorage(type, [k1,k2]) // => chrome.storage[type].get([k1,k2])

// All calls return a promise, regardless of whether the actual
// backend method called has a sync, callback or promise return type
myExt.execExtensionCommand('runtime', 'sendMessage', [msg]) // => chrome.runtime.sendMessage(msg)
myExt.execExtensionCommand('tabs.TAB_ID_NONE')               // => chrome.runtime.sendMessage(msg)
myExt.execExtensionCommand('pageAction', 'show', [], { returnType: 'sync' })  // => chrome.runtime.sendMessage(msg)
  .then((response) => doSomething(response));

// you can keep 2 helper objects around to control 2 different extensions
const myOtherExt = require('@victal/cypress-extensions-plugin/helpers')({ alias: 'myOtherExt' });
Promise.all([myExt, myOtherExt].map(e => e.clearExtensionStorage(type)); // is equivalent to:
Promise.all(['myExt', 'myOtherExt'].map(a => myExt.clearExtensionStorage(type, { alias: a }))
```

## Why?

There are a few limitations to browser extensions that make them hard to test in Cypress:

1. You can't (readily) access the extension's local storage to reset it (or apply fixtures) between tests. Or the browser extension API in general. (This is not specific to Cypress, same problem with Selenium)
2. Cypress has 3 frames, only one of which is for the app under test. To test a content script, you want it to run only in that frame.

## How?

This plugin works around those problems by creating a test copy of your extension into a temporary dir, into which it modifies the manifest to:

1. override your content scripts `all_frames` and `matches` confs so your extension will load in the Cypress iframe for the page under test, and only there
2. inject a content and background script to let Cypress reach the browser extension API in the background tab by relaying messages with `window.postMessage` and `chrome.runtime.sendMessage` (disable this with the `skipHooks` option)

Then it's that modified extension that gets loaded into the browser opened by Cypress.

## Security

**TL;DR Only use this on tests that visit trusted webpages. Don't store sensitive data in your Browser's test profile/env. And you'll be fine.**

Long version: If your Cypress tests visit an untrusted page, that page can possibly craft a `window.postMessage` request to exploit this plugin's hooks and gain access to your extension's backend API in the same way Cypress does. Effectively, the potential impact is the same as installing an untrusted extension on your test browser with all the same permissions your extension under test has.

(It's quite low-risk low-impact really. Why would a page bother to add specifically-crafted `postMessage`s to its JS to access the worthless test data of an unlikely Cypress-extension-testing visitor on a test browser profile? Is it a big deal if they access your test data or mess with your test browser profile? Then tiny as the risk may be, you should take it knowingly)

Overall, this plugin saves you from having to add those unsafe hooks in your extension's production code, so used responsibly it should be a security net positive.

NB: Those concerns don't apply if you use the [`skipHook` option](#barebone-usage-skip-hooks).

## Implementation notes: method callbacks, sync properties and command promises

Note: The plugin's default behaviour should work in 99% of the cases, only read on if you're interested in implementation details or are running into a specific problem with return values using `execExtensionCommand`.

This plugin needs to juggle the 3 methods JS has for returning values: synchronous, callback and promise. In the Chrome extensions API, method calls (`chrome.some.property.method(arg1, ..., callback)`) are async, accepting a callback as their last argument to pass their return value, while properties are accessed synchronously (`chrome.some.property`). Cypress, in contrast, uses and expects promises everywhere. So the plugin needs to turn the callbacks/sync returns of the browser API into promises for Cypress.

So it assumes Chrome's convention is respected everywere and, by default it passes a callback to all method calls that it relays to the `chrome` object (i.e. when you've called `execExtensionCommand(property, method[, args])`) and "promisifies" that callback to generate the promise it returns to Cypress. On mere property access (i.e. when you're not passing a `method`: `execExtensionCommand(property)`), it assumes access to a synchronous value and resolves its return promise to that value.

But should you ever find yourself calling a method that, for some reason, doesn't follow the convention and makes a synchronous return instead of accepting a callback (the only example I could find was [`pageAction.show()/hide()`](https://developer.chrome.com/extensions/pageAction#method-show)), you'll need to pass the `{ returnType: 'sync' }` option to let the plugin know how to handle it (`execExtensionCommand(property, method, args, { returnType: 'sync' }`). Otherwise, the plugin will try to pass a callback, which is likely to result in an error and the result getting lost.

(This is the same kind of problem Mozilla's [`webextension-polyfill`](https://github.com/mozilla/webextension-polyfill) run into  when they need to turn Chrome's callback-based returns into promises as per the emerging WebExtension standard based off Chrome's API, though they solve it in a [slightly more involved way](https://github.com/mozilla/webextension-polyfill/blob/596f47bcc8715aa5301612cffce0c60540c02bff/src/browser-polyfill.js#L135-L143) I didn't feel was worth replicating here.)

## TODO

- Add secure messaging (encryption+nonce+loader generates pwd shared w/ helpers via Cypress config/env?) so visited pages can't exploit `window.postMessage` listeners to abuse your background API (low-priority, see [Security](#security))
