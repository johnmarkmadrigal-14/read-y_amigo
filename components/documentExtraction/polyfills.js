// Run before PDF.js imports. Android System WebView can lag the OS/browser;
// PDF.js legacy includes core-js syntax/runtime shims, but these Promise APIs
// are also needed on Chrome <119 / iOS <17.4.
if (!Promise.withResolvers) {
  Object.defineProperty(Promise, 'withResolvers', { configurable: true, writable: true,
    value: function () {
      let resolve, reject;
      const promise = new this((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    } });
}
if (!Promise.try) {
  Object.defineProperty(Promise, 'try', { configurable: true, writable: true,
    value: function (callback, ...args) { return new this(resolve => resolve(callback(...args))); } });
}
