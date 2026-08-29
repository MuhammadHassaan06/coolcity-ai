// Preload script to mock 'server-only' package for Node test runner
// eslint-disable-next-line @typescript-eslint/no-require-imports
const moduleAlias = require("module");
const originalRequire = moduleAlias.prototype.require;

moduleAlias.prototype.require = function (modulePath) {
  if (modulePath === "server-only") {
    return {};
  }
  // eslint-disable-next-line prefer-rest-params
  return originalRequire.apply(this, arguments);
};
