const path = require('path');

module.exports = function (api) {
  api.cache(true);
  const workspaceRoot = path.resolve(__dirname, '../..');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        require.resolve('babel-plugin-module-resolver'),
        {
          root: [workspaceRoot],
          alias: {
            '@growlog/web-lib': path.join(workspaceRoot, 'lib'),
          },
          extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
        },
      ],
    ],
  };
};
