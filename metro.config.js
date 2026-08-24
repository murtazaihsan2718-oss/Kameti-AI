const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Anchor blocklist regexes strictly to the root project directories to avoid blocking node_modules files (like react/cjs/react.development.js)
const rootCss = path.resolve(__dirname, 'css');
const rootJs = path.resolve(__dirname, 'js');

config.resolver.blockList = [
  new RegExp(`^${rootCss.replace(/\\/g, '\\/')}\\/.*`),
  new RegExp(`^${rootJs.replace(/\\/g, '\\/')}\\/.*`),
  /.*\.html$/,
  /\.git\/.*/,
];

module.exports = config;
