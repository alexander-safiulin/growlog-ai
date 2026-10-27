const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules/.pnpm/node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.extraNodeModules = {
  '@growlog/domain': path.resolve(workspaceRoot, 'packages/domain/src'),
  '@growlog/api-client': path.resolve(workspaceRoot, 'packages/api-client/src'),
  '@growlog/nutrient-calc': path.resolve(workspaceRoot, 'packages/nutrient-calc/src'),
};

module.exports = config;
