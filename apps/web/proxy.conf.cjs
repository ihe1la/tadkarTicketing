const apiTarget = process.env.TADKAR_API_URL ?? 'http://localhost:3000';

module.exports = {
  '/api': {
    changeOrigin: true,
    secure: true,
    target: apiTarget,
  },
};
