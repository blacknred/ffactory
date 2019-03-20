/* eslint-disable no-param-reassign */
const Url = require('url');
const Path = require('path');
const TextToSVG = require('text-to-svg');
const request = require('request-promise');

const sharp = require('./sharp');
const ffmpeg = require('./ffmpeg');

const SPLITTER = '~';
const SVG = TextToSVG.loadSync(Path.join(__dirname, 'assets', 'Ubuntu-Bold.ttf'));

async function processor(path, rawOpts = {}, ext, onFly = false, progressCb) {
    if (!ext) {
        ext = Path.extname(path).slice(1);
    }

    if (progressCb && typeof progressCb !== 'function') {
        progressCb = null;
    }

    console.log(rawOpts, ext);

    const opts = {
        onFly,
        ext,
        format: rawOpts.f || rawOpts.format,

        width: parseInt(rawOpts.w || rawOpts.width, 10) || null,
        height: parseInt(rawOpts.h || rawOpts.height, 10) || null,
        aspectRatio: rawOpts.ar || null,

        trim: parseInt(rawOpts.t || rawOpts.trim, 10) || null,
        duration: parseInt(rawOpts.d || rawOpts.duration, 10) || null,

        quality: parseInt(rawOpts.q || rawOpts.quality, 10) || null,
        metadata: (rawOpts.m || rawOpts.metadata) === true,
        improve: (rawOpts.i || rawOpts.improve) === true,

        preset: rawOpts.p || rawOpts.preset,
    };

    if (rawOpts.c) {
        const crop = rawOpts.c || rawOpts.crop;
        const parts = crop.split(SPLITTER);

        opts.fit = parts[0] || crop;
        opts.fit_position = parts[1] || null;
    }

    if (rawOpts.mg) {
        const merge = rawOpts.mg || rawOpts.merge;
        const parts = merge.split(SPLITTER);
        let buffer;

        try {
            const url = new Url.URL(parts[0] || merge);

            if (!sharp.EXT.includes(Path.extname(url.href).slice(1))) {
                throw new Error();
            }

            buffer = await request.get(url.href, {
                encoding: null,
            });
        } catch (e) {
            buffer = Buffer.from(SVG.getSVG(parts[0] || merge, {
                fontSize: parseInt(parts[2], 10) || 33,
                anchor: 'top',
            }));
        } finally {
            if (parts[1]) {
                if (parts[1].match(/^[\d+,]+$/ig)) {
                    const axes = parts[1].split(',');

                    opts.merge_position_x = axes[0];
                    opts.merge_position_y = axes[1] || axes[0];
                } else {
                    opts.merge_position = parts[1];
                }
            }

            opts.merge = await sharp.container(buffer, {
                width: opts.width,
                height: opts.height,
            });
        }
    }

    if (sharp.EXT.includes(ext) || sharp.EXT.includes(opts.f)) {
        return sharp.sharp(path, opts);
    }

    return ffmpeg.ffmpeg(path, opts, progressCb);
}

module.exports = {
    processor,
    PROCESSABLE_EXT: [...sharp.EXT, ...ffmpeg.EXT],
};
