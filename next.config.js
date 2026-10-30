const path = require('path');
const { execSync } = require('child_process');

function resolveBuildId() {
  const fromEnv =
    process.env.BUILD_ID ||
    process.env.SOURCE_COMMIT ||
    process.env.COOLIFY_COMMIT_SHA;
  if (fromEnv) return String(fromEnv).trim();
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return String(Date.now());
  }
}

const BUILD_ID = resolveBuildId();

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  buildExcludes: [/dynamic-css-manifest\.json$/],
  // next-pwa + Next 15 иногда даёт ENOENT pages-manifest при сборке; при сбое: disable: true
  disable: process.env.NODE_ENV === 'development' || process.env.DISABLE_PWA === '1',
});

module.exports = withPWA({
  reactStrictMode: true,
  webpack: (config) => {
    // pnpm can leave older React copies on disk; force one instance for hooks + SSR.
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.join(__dirname, 'node_modules/react'),
      'react-dom': path.join(__dirname, 'node_modules/react-dom'),
    };
    return config;
  },
  generateBuildId: async () => BUILD_ID,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
    BUILD_ID,
  },
  eslint: {
    dirs: ['pages/nutrient', 'components/nutrient', 'lib/nutrient'],
  },
});
