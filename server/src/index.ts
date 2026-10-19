import app from './server';

export default app;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  module.exports.default = app;
}
