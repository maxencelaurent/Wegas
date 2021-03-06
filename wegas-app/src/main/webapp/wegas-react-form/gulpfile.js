// eslint-disable-next-line
const gulp = require('gulp');
const webpack = require('webpack');

const config = require('./webpack.config');

gulp.task('default', ['build']);
gulp.task('build', callback => {
    webpack({ ...config, mode: 'production' }, (err, stats) => {
        if (err) return callback(err);
        if (stats.hasErrors()) {
            return callback(
                new Error(
                    stats.toString({
                        color: true,
                    })
                )
            );
        }
        // eslint-disable-next-line
        console.log(
            '[webpack]',
            stats.toString({
                color: true,
            })
        );
        return callback();
    });
});
