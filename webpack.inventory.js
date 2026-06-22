const path = require('path');
const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  entry: './src/client/portals/inventory/index.tsx',
  output: {
    path: path.resolve(__dirname, 'public/inventory'),
    filename: 'inventory.bundle.js',
    publicPath: '/inventory/',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/client/portals/inventory/index.html',
      filename: 'index.html',
      title: 'Elegance by Sconia — Inventory',
    }),
    new MiniCssExtractPlugin({ filename: 'inventory.css' }),
  ],
});
