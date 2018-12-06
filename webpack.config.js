const path = require('path');

module.exports = {
    entry: './src/rum.js',
    output: {
        filename: 'rum.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'rum',
        libraryTarget: 'umd'
    },
    // devtool: 'source-map',
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