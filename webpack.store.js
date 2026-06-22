const path = require('path');
const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  entry: './src/client/portals/store/index.tsx',
  output: {
    path: path.resolve(__dirname, 'public/store'),
    filename: 'store.bundle.js',
    publicPath: '/store/',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/client/portals/store/index.html',
      filename: 'index.html',
      title: 'Elegance by Sconia',
    }),
    new MiniCssExtractPlugin({ filename: 'store.css' }),
  ],
});
