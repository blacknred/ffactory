const fs = require('fs');
const os = require('os');
const Path = require('path');
const crypto = require('crypto');
const isColor = require('is-color');
const child = require('child_process');
const Ffmpeg = require('fluent-ffmpeg');

const config = require('../../config');

const EXT = {
    video: ['mp4', 'flv', 'ogg', 'webm', 'avi', 'mov',
    'hls', '3gp', 'mpg', 'mpeg', 'mkv', 'matroska'],
    audio: ['mp3', 'aac', 'ac3', 'm4a'],
    image: ['gif', 'png', 'jpg', 'jpeg'],
    get all() {
        return this.video.concat(this.audio, this.image);
    }
};
const CODECS = {
    mp4: {
        video: 'libx264',
        audio: 'aac',
    },
    webm: {
        video: 'libvpx',
        audio: 'libvorbis',
    },
    avi: {
        video: 'mpeg4',
        audio: 'libmp3lame',
    },
    mov: {
        video: 'copy',
        audio: 'copy',
    },
    ogg: {
        video: 'libvpx',
        audio: 'libvorbis',
    },
    flv: {
        video: 'libx264',
        audio: 'copy',
    },
    hls: {
        video: 'copy',
        audio: 'copy',
    },
    '3gp': {
        video: 'copy',
        audio: 'copy',
    },
    mpeg: {
        video: 'mpeg2video',
        audio: 'mp2',
    },
    matroska: {
        video: 'copy',
        audio: 'copy',
    }
};
const CROP_POSITION_MAP = {
    center: '30:30',
    top: 'top',
    left: 'left',
    bottom: 'bottom',
    right: 'right',
    right_top: 'right top',
    right_bottom: 'right bottom',
    left_bottom: 'left bottom',
    left_top: '300:0',
};
const END_TIMESPAN = 120000;
const RENICE_TIMESPAN = 20000;

const onProgress = p => console.log(`${(p.percent).toFixed(2)} %`);
const padColorValidate = (color) => {
    if (isColor(color)) {
        return color;
    }
    if (isColor(`#${color}`)) {
        return `#${color}`;
    }
    return 'white';
};
const validateFormat = (f) => {
    if (!EXT.all.includes(f)) {
        return null;
    }
    switch (f) {
        case 'mpg': return 'mpeg';
        case 'mkv': return 'matroska';
        case 'aac':
        case 'ac3':
        case 'm4a': return 'adts';
        case 'jpg':
        case 'jpeg':
        case 'png': return 'image2pipe';
        default: return f;
    }
};

function ffmpeg(input, opts, progressCb) {
    const format = validateFormat(opts.format);

    const operation = Ffmpeg(input);

    // Command takes too long, raise its priority
    setTimeout(() => operation.renice(-5), RENICE_TIMESPAN);
    // Kill ffmpeg anyway
    setTimeout(() => operation.kill(), END_TIMESPAN);

    // cpu
    operation.inputOption('-threads', os.cpus().length);

    // events
    if (!config.is_dev) {
        operation
            .on('progress', progressCb || onProgress) // handle progress
            .on('filenames', console.log) // show result
            .on('end', console.log);
    }
    operation.on('start', console.log) // show command
    .on('error', console.log);
    if (opts.onFly) {
        /*
        you may not use mp4 when outputting to a stream, as mp4 requires
        a seekable output (it needs to go back after having written the
        video file to write the file header).
        frag_keyframe allows fragmented output.
        empty_moov will cause output to be 100% fragmented - without
        this the first fragment will be muxed as a short movie
        (using moov) followed by the rest of the media in fragments.
        */
        // operation.inputOption('-re');
        // operation.outputOption('-movflags', 'frag_keyframe+empty_moov');
        // '-movflags', 'frag_keyframe+faststart',
        // '-frag_size', '1048576',
    }

    // transformation
    // if (opts.start) {
    //     operation.seekInput(opts.start);
    //     // operation.seekOutput(opts.trim.stop);
    // }
    // if (opts.length) {
    //     operation.duration(opts.length);
    // }
    // if (opts.fit_opt === 'blur') {
    //     if ((opts.format || opts.ext) === 'mp4') {
    //         operation.videoFilter([
    //             `[0:v]scale=iw:ih,boxblur=luma_radius=min(h\\,w)/20:luma_power=1:chroma_radius=min(cw\\,ch)/20:chroma_power=1[bg];
    //             [0:v]scale=720:720:force_original_aspect_ratio=decrease[fg];
    //             [bg][fg]overlay=(W-w)/2:(H-h)/2[outv]`
    //         ]);
    //         operation.outputOptions([
    //             '-map [outv]',
    //             '-map 0:a?',
    //         ]);
    //     } else {
    //         operation.videoFilter(
    //             `split [original][copy];
    //             [copy] crop=ih*9/16:ih:iw/2-ow/2:0, scale=ih:-1, gblur=sigma=20[blurred];
    //             [blurred][original]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2`
    //         );
    //     }
    // }

    if (opts.width || opts.height || opts.aspectRatio || opts.fit) {
        const vfOpts = [];

        if (opts.fit === 'pad') {
            if (opts.fit_opt === 'blur') {
                vfOpts.push(
                    `split [original][copy];
                [copy] crop=ih*9/16:ih:iw/2-ow/2:0, scale=ih:-1, gblur=sigma=20[blurred];
                [blurred][original]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2`
                );
            } else {
                vfOpts.push(`pad=${opts.width || 'iw'}:${opts.height || 'ih'}:(ow-iw)/2:(oh-ih)/2:white`);
                // operation.autopad(padColorValidate(opts.fit_opt));
            }
        }

        if (opts.fit_opt === 'crop') {
            vfOpts.push(`crop=iw:ih:${CROP_POSITION_MAP[opts.fit_position || 'center']}`);
            // min(iw,1*ih)':'min(iw/1,ih)'
        }

        if (opts.width || opts.height) {
            vfOpts.push(`scale=${opts.width || 'iw'}:${opts.height || 'ih'}`);
        }

        if (opts.aspectRatio) {
            vfOpts.push(`setdar=dar=${opts.aspectRatio}`);
        }

        operation.videoFilters(vfOpts);
    }
    // merge
    // if (opts.merge) {
    //     operation.addInput(opts.logo.src);
    //     operation.complexFilter(`"overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2"`);
    // }
    //     ffmpeg()
    //    .input(videofile.mp4)
    //     .input(watermark.png)
    //     .videoCodec('libx264')
    //     .outputOptions('-pix_fmt yuv420p')
    //     .complexFilter([
    //         "[0:v]scale=640:-1[bg];[bg][1:v]overlay=W-w-10:H-h-10"
    //     ])



    // transcoding

    // video -> jpg, jpg -> video
    // video -> gif, gif -> video
    if (EXT.image.includes(opts.format)) {
        if (opts.format === 'gif') {
            // extract a palette
            const palette = Path.join(os.tmpdir(), crypto.randomBytes(20).toString('hex'));
            operation.addOutputOptions('-vf "fps=10,scale=320:-2:flags=lanczos,palettegen"');
            operation.saveToFile(palette);
            // use palette for converting
            operation.addInput(palette);
            operation.complexFilter(`"fps=10,scale=320:-2:lanczos[video];[video][1:v]paletteuse"`);
        } else {
            if (opts.format === 'png') {
                operation.addOutputOptions(['-vframes', '1', '-c:v', 'png']);
            } else {
                operation.addOutputOptions(['-vframes', '1', '-q:v', '2']);
            }
        }
        /*
        // gif
        .format('gif')
        .size('640x360')
        .duration('0:15')
        .inputFPS(8)

        // jpg
        .loop(5)
        .fps(25)
        .save('/path/to/your_target.m4v');
        */
    }
    // video -> audio, ?audio -> audio
    if (EXT.audio.includes(opts.format)) {
        operation.outputOptions(['-vn', '-q:a', '0', '-map', 'a']);
    }
    // video -> video
    if (EXT.video.includes(opts.format)) {
        operation.videoCodec(CODECS[format].video || 'copy');
        operation.audioCodec(CODECS[format].audio || 'copy');
        // operation.addOutputOptions(['-level', '3.0', '-pix_fmt', 'yuv420p']); // -profile:v baseline
    }


    operation.outputOption('-f', format || opts.ext);
    // .save('your rtmp url') /tmp
    return operation;
}

function ffmpegRaw(input, opts) {
    const args = ['-f', 'mp4', '-i', 'pipe:0', '-f', 'mp4', 'pipe:1'];

    /*
    '-i', 'pipe:0',
    '-codec:v', 'libvpx', '-quality', 'good', '-cpu-used', '0',
    '-b:v', '225k', '-qmin', '10', '-qmax', '42', '-maxrate', '300k',
    '-bufsize', '1000k', '-threads', '2', '-vf', 'scale=-1:560',
    '-codec:a', 'libvorbis', '-b:a', '128k', '-through', '2', '-f', 'webm',
    'pipe:1'
    */
    const reader = fs.createReadStream(input);
    const operation = child.spawn('ffmpeg', args);
    reader.pipe(operation.stdin);

    operation.stdin.on('data', () => console.log('in'));
    operation.stdout.on('data', () => console.log('out'));
    operation.stderr.on('data', data => console.log(data.toString()));
    operation.stderr.on('end', () => console.log('has been converted.'));
    operation.stderr.on('exit', () => console.log('child process exited'));
    operation.stderr.on('close', () => console.log('...closing time! bye'));

    return operation.stdout;
}

module.exports = {
    ffmpeg,
    ffmpegRaw,
    EXT: EXT.all,
};
