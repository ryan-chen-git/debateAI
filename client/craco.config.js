const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Handle TypeScript paths
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins || [];
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        shared: path.resolve(__dirname, '../shared'),
      };
      
      // Suppress compilation errors from console and browser
      webpackConfig.infrastructureLogging = {
        level: 'none',
      };
      webpackConfig.stats = 'none';
      
      return webpackConfig;
    },
  },
}
