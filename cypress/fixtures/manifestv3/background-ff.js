/* globals chrome */
console.log('Loaded firefox fallback for manifest v3 fixture extension background script');
chrome.runtime.onStartup.addListener(() => {
  chrome.runtime.local.storage.set({ content: true, version: 2, browser: 'firefox' });
});
