const Sharp = require('sharp');

const config = require('../../config');

if (!config.is_dev) {
    Sharp.concurrency(config.uv_threadpool_size);
}

const TRANSFORMS = ['pad', 'crop'];
const TRANSFORMS_MAP = {
    crop: 'cover',
    pad: 'contain',
};
const EXT = ['jpeg', 'png', 'webp', 'tiff'];
const OPTS = {
    jpeg: {
        quality: 80,
        progressive: true,
    },
    png: {
        quality: 80,
        progressive: true,
    },
    webp: {
        quality: 80,
        alphaQuality: 100,
    },
    tiff: {
        quality: 80,
        compression: 'lzw',
        squash: true
    },
};

function sharp(input, opts) {
    const operation = Sharp(input);

    operation.on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
    });

    // transformation  ...blur, negate
    if (opts.width || opts.height) {
        operation.resize(opts.width, opts.ar ? opts.width * opts.ar : opts.height, {
            fit: TRANSFORMS_MAP[opts.transform],
        });
    }

    if (opts.trim) {
        operation.trim(opts.trim);
    }

    if (opts.merge) {
        operation.overlayWith(opts.merge.src, {
            top: opts.merge.top,
            left: opts.merge.left,
        });
    }


    // misc
    if (opts.metadata) {
        operation.withMetadata();
    }

    if (opts.improve) {
        operation
            .median()
            .sharpen()
            .normalise();
    }


    // format
    operation.toFormat(
        opts.format,
        {
            ...OPTS[opts.f],
            quality: opts.quality,
        }
    );

    return operation;
}

exports = {
    sharp,
    TRANSFORMS,
    EXT,
};

