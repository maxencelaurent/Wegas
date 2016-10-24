const path = require('path');
const webpack = require('webpack');
const cssnext = require('postcss-cssnext');

module.exports = {
    devtool: 'source-map',
    entry: ['babel-polyfill', './src/index.js'],
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js',
        library: 'JSONInput',
        libraryTarget: 'umd'
    },
    plugins: [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        }),
        new webpack.optimize.UglifyJsPlugin({
            compressor: {
                warnings: false
            },
            sourceMap: true,
            comments: false
        })
    ],
    module: {
        rules: [{
            test: /\.jsx?$/,
            loaders: ['babel'],
            exclude: /node_modules/
            // include: [
            //     path.join(__dirname, 'src')
            // ]
        }, {
            test: /\.css$/,
            use: [
                'style',
                {
                    loader: 'css',
                    options: {
                        modules: true,
                        importLoaders: 1
                    }
                },
                {
                    loader: 'postcss',
                    options: {
                        plugins: () => [cssnext]
                    }

                }
            ]
        }]
    }
};
