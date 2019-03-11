const Path = require('path');
const crypto = require('crypto');
const stream = require('stream');
const tmpdir = require('os').tmpdir();
const child = require('child_process');
const Ffmpeg = require('fluent-ffmpeg');

const TRANSFORMS = ['pad', 'crop', 'blur'];
const EXT = {
    video: ['mp4', 'flv', 'webm', 'avi', 'mov', 'mkv', 'hls', '3gp'],
    audio: ['mp3', 'ogg', 'aac', 'ac3'],
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
    mkv: {
        video: 'copy',
        audio: 'copy',
    },
    flv: {
        video: 'copy',
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
}

const through = new stream.PassThrough();

function ffmpeg(input, opts) {
    const operation = Ffmpeg();

    operation.input(input);

    operation.on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
    });


    // transformation
    if (opts.width || opts.height) {
        operation.size(`${opts.width || '?'}x${opts.height || '?'}`);
    }

    if (opts.ar) {
        operation.aspect(opts.ar);
    }

    if (opts.transform) {
        if (opts.transform === 'pad') {
            operation.autopad('black');
        }
        if (opts.transform === 'blur') {
            operation.complexFilter("[0:v]scale=720:720,boxblur=luma_radius=min(h\,w)/20:luma_power=1:chroma_radius=min(cw\,ch)/20:chroma_power=1[bg];[0:v]scale=720:720:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]");
            operation.inputOptions([
                '-map [outv]',
                '-map 0:a?',
            ]);
        }
        if (opts.transform === 'crop') {
            operation.inputOptions([
                '-vf "crop='min(iw,1*ih)':'min(iw/1,ih)',scale=720:720"',
            ]);
        }
    }

    if (opts.trim) {
        operation.seekInput(opts.trim.start);
        operation.seekOutput(opts.trim.stop);
    }

    if (opts.merge) {
        operation.addInput(opts.logo.src);
        operation.complexFilter("overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2");
    }


    // format
    if (EXT.image.includes(opts.format)) {
        if (opts.format === 'gif') {
            // extract a palette
            const palette = Path.join(tmpdir, crypto.randomBytes(20).toString('hex'));
            operation.addOutputOptions('-vf "fps=10,scale=320:-2:flags=lanczos,palettegen"');
            operation.saveToFile(palette);
            // use palette for converting
            operation.addInput(palette);
            operation.complexFilter("fps=10,scale=320:-2:lanczos[video];[video][1:v]paletteuse");
        }

    } else {
        if (EXT.video.includes(opts.format)) {
            operation.videoCodec(CODECS[opts.format].video);
        }
        operation.audioCodec(CODECS[opts.format].audio);
    }

    operation.outputFormat(opts.format)

    operation.pipe(through);

    return through;
}

exports = {
    ffmpeg,
    TRANSFORMS,
    EXT: Object(EXT).values(),
};

function ffmpegRaw(args = []) {
    const fmpeg = child.spawn('ffmpeg', args);

    // stream.Duplex.call(this);
    through.pipe(fmpeg.stdin).pipe(fmpeg.stdout);

    // through.on('data', console.log);
    fmpeg.stdin.on('data', () => console.log('in'));
    fmpeg.stdout.on('data', () => console.log('out'));
    fmpeg.stderr.on('data', data => console.log(data.toString()));
    fmpeg.stderr.on('end', () => console.log('has been converted.'));
    fmpeg.stderr.on('exit', () => console.log('child process exited'));
    fmpeg.stderr.on('close', () => console.log('...closing time! bye'));

    return through;
}

function formatToVideo(f) {
    const rdd = new stream.Readable({
        read() {}
    });
    const th = new stream.PassThrough();
    // th.on('data', console.log);
    th.pipe(rdd);
    ffmpeg(rdd) // Path.resolve(__dirname, '../tests/integration/1.avi')
        // .audioCodec('libfaac')
        // .videoCodec('libx264')
        // .input('pipe:0')
        .format('avi')
        .size('20x?')
        .on('error', (e, stdout, stderr) => console.log('ooooooooooooooooooooo', e, stderr))
        .on('end', () => console.log('has been converted.'))
        .saveToFile(Path.resolve(__dirname, '../tests/integration/13.avi'))
    //.pipe(th);
    // .aspect('4:3')
    // .audioCodec(DEFAULTS.options.video.audioCodec)
    // .videoCodec(DEFAULTS.options.video.videoCodec);
    return th;
}

function videoThumb(w) {
    return ffmpeg()
        .size(w ? `${w}x?` : DEFAULTS.thumbs.video)
        .noAudio()
        .seek('0:01');
}

function resizeVideoRaw(h, w) {
    return ffmpegRaw([]);
}

function formatToVideoRaw(f) {
    const args = {
        webm: [
            '-i', 'pipe:0',
            '-codec:v', 'libvpx', '-quality', 'good', '-cpu-used', '0',
            '-b:v', '225k', '-qmin', '10', '-qmax', '42', '-maxrate', '300k',
            '-bufsize', '1000k', '-threads', '2', '-vf', 'scale=-1:560',
            '-codec:a', 'libvorbis', '-b:a', '128k', '-through', '2', '-f', 'webm',
            'pipe:1'
        ]
    };
    return ffmpegRaw(['-i', 'pipe:0', '-f', `${f}`, 'pipe:1']);
}
