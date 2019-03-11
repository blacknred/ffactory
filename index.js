/* eslint-disable no-param-reassign */
const Path = require('path');

const sharp = require('./sharp');
const ffmpeg = require('./ffmpeg');

function processor(path, rawOpts, ext) {
    if (!Path.isAbsolute(path)) {
        path = Path.resolve(__dirname, path);
    }

    if (!ext) {
        ext = Path.extname(path).slice(1);
    }

    // validate opts &f=&q=&w=&h=&ar=&t=
    const opts = {
        format: rawOpts.f || ext,
        quality: rawOpts.q || 80,

        width: parseInt(rawOpts.w, 10) || null,
        height: parseInt(rawOpts.h, 10) || null,
        aspectRatio: rawOpts.ar || this.width / this.height || 1,
        
        transform: ,

        

        trim: rawOpts.tr ? {
            start: rawOpts.split(':')[0],
            stop: rawOpts.split(':')[1],
         } : null,
        logo: rawOpts.m ? {
            src: rawOpts.split(':')[0],
            position: rawOpts.split(':')[1],
        } : null,

        preset: rawOpts.preset || null,


        metadata: rawOpts.meta,
        enhance: rawOpts.enhance || false,
    };

    if (sharp.EXT.includes(ext) || sharp.EXT.includes(opts.f)) {
        return sharp.sharp(path, opts);
    }

    return ffmpeg.ffmpeg(path, opts);
}

module.exports = {
    PROCESSABLE_EXT: [...sharp.EXT, ...ffmpeg.EXT],
    processor,
};
