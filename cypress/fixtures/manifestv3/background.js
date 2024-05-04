/* globals chrome */
console.log('Loaded manifest v3 fixture extension background script');
chrome.runtime.onStartup.addListener(() => {
  chrome.runtime.local.storage.set({ content: true, version: 3 });
});
