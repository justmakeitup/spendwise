// Vercel Express Framework Entrypoint
const mod = require('./dist/server');
const app = mod.default || mod;

module.exports = app;
module.exports.default = app;