const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const isColor = require('is-color');
const child = require('child_process');
const Ffmpeg = require('fluent-ffmpeg');

const EXT = {
    video: ['mp4', 'flv', 'ogg', 'webm', 'avi', 'mov', 'hls', '3gp'],
    audio: ['mp3', 'aac', 'ac3'],
    image: ['gif', 'png', 'jpg'],
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
};
const CROP_POSITION_MAP = {
    center: '',
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
const getSizes = (w, h, ar) => {

};

function ffmpeg(input, opts, progressCb) {
    const operation = Ffmpeg(input);

    // Command takes too long, raise its priority
    setTimeout(() => operation.renice(-5), RENICE_TIMESPAN);
    // Kill ffmpeg anyway
    setTimeout(() => operation.kill(), END_TIMESPAN);

    operation
        // show command
        .on('start', console.log)
        .on('end', console.log)
        .on('error', console.log)
        .on('filenames', console.log)
        // handle progress
        .on('progress', progressCb || onProgress);
        // metadata
        // .ffprobe((err, metadata) => console.log('metadata'));

    if (opts.trim) {
        operation.seekInput(opts.trim);
        // operation.seekOutput(opts.trim.stop);
    }

    if (opts.duration) {
        operation.duration(opts.duration);
    }

    if (opts.onFly) {
        /*
        you may not use mp4 when outputting to a stream, as mp4 requires
        a seekable output (it needs to go back after having written the
        video file to write the file header).
        frag_keyframe allows fragmented output &
        empty_moov will cause output to be 100% fragmented;
        without this the first fragment will be muxed as a short movie
        (using moov) followed by the rest of the media in fragments.
        */
        operation.inputOptions(['-re', '-threads', os.cpus().length]);
        operation.outputOptions([
            // '-movflags', 'frag_keyframe+faststart',
            '-movflags', 'frag_keyframe+empty_moov',
            '-frag_size', '1048576',
        ]);
    }

    // transformation
    if (opts.width || opts.height) {
        operation.size(`${opts.width || '?'}x${opts.height || '?'}`);
    }

    if (opts.aspectRatio) {
        operation.aspect(opts.aspectRatio);
    }

    if (opts.fit) {
        if (opts.fit === 'pad') {
            if (opts.fit_opt === 'blur') {
                if ((opts.format || opts.ext) === 'mp4') {
                    operation.videoFilter([
                        `[0:v]scale=iw:ih,boxblur=luma_radius=min(h\\,w)/20:luma_power=1:chroma_radius=min(cw\\,ch)/20:chroma_power=1[bg];
                        [0:v]scale=720:720:force_original_aspect_ratio=decrease[fg];
                        [bg][fg]overlay=(W-w)/2:(H-h)/2[outv]`
                    ]);
                    operation.outputOptions([
                        '-map [outv]',
                        '-map 0:a?',
                    ]);
                } else {
                    operation.videoFilter(
                        `split [original][copy];
                        [copy] crop=ih*9/16:ih:iw/2-ow/2:0, scale=ih:-1, gblur=sigma=20[blurred];
                        [blurred][original]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2`
                    );
                }
            } else {
                operation.autopad(padColorValidate(opts.fit_opt));
            }
        } else if (opts.fit === 'crop') {
            operation.videoFilter([
                `crop='min(iw,1*ih)':'min(iw/1,ih)':${CROP_POSITION_MAP[opts.fit_opt || 'center']}`,
                // {
                //     filter: 'scale',
                //     options: 'iw:ih', // `crop=240:120:240:120`
                // },
            ]);
        }
    }

    

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


    // if (EXT.image.includes(opts.format)) {
    //     if (opts.format === 'gif') {
    //         // extract a palette
    //         const palette = Path.join(os.tmpdir(), crypto.randomBytes(20).toString('hex'));
    //         operation.addOutputOptions('-vf "fps=10,scale=320:-2:flags=lanczos,palettegen"');
    //         operation.saveToFile(palette);
    //         // use palette for converting
    //         operation.addInput(palette);
    //         operation.complexFilter(`"fps=10,scale=320:-2:lanczos[video];[video][1:v]paletteuse"`);
    //     }
    //     /*
    //     // gif
    //     .format('gif')
    //     .size('640x360')
    //     .duration('0:15')
    //     .inputFPS(8)

    //     // jpg
    //     .loop(5)
    //     .fps(25)
    //     .save('/path/to/your_target.m4v');
    //     */
    // }

    // operation.preset('superfast'); // flashvideo
    operation.outputFormat(opts.format || opts.ext);
    operation.videoCodec(CODECS[opts.format].video || 'copy');
    operation.audioCodec(CODECS[opts.format].audio || 'copy');

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
    EXT: [...EXT.video, ...EXT.audio, ...EXT.image],
};
