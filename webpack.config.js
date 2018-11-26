const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: './src/rum/RUMClient.js',
    output: {
        filename: 'rum.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'RUMClient',
    },
    devtool: 'source-map',
    target: 'web',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                include: [
                    path.resolve(__dirname, 'src')
                ],
                exclude: [
                    path.resolve(__dirname, 'lib')
                ],
                loader: 'babel-loader',
                options: {
                    presets: ["es2015"]
                }
            }
        ]
    }
};