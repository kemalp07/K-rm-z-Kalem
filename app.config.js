// app.json holds the config; this only adds what depends on how the build is hosted.
// GitHub Pages serves the web build under /<repo>/, so CI sets EXPO_WEB_BASE_URL to that path.
module.exports = ({ config }) => ({
  ...config,
  web: { ...config.web, output: 'single' },
  experiments: { ...config.experiments, ...(process.env.EXPO_WEB_BASE_URL ? { baseUrl: process.env.EXPO_WEB_BASE_URL } : {}) },
});
