const Sharp = require('sharp');

const config = require('../../config');

if (!config.is_dev) {
    Sharp.concurrency(config.uv_threadpool_size);
}

const EXT = ['jpg', 'jpeg', 'png', 'webp', 'tiff'];
const FIT_MAP = {
    crop: 'cover',
    pad: 'contain',
    scale: 'fill',
};
const FIT_POSITION_MAP = {
    center: 'center',
    top: 'top',
    left: 'left',
    bottom: 'bottom',
    right: 'right',
    right_top: 'right_top',
    right_bottom: 'right_bottom',
    left_bottom: 'left_bottom',
    left_top: 'left_top',
};
const FIT_GRAVITY_MAP = {
    center: 'center',
    top: 'north',
    left: 'west',
    bottom: 'south',
    right: 'east',
    right_top: 'northeast',
    right_bottom: 'southeast',
    left_bottom: 'southwest',
    left_top: 'northwest',
};
const EXT_OPTS = {
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

    return operation.metadata().then((meta) => {
        // transformation
        if (opts.width || opts.height || opts.aspectRatio || opts.fit) {
            operation.resize({
                // width: opts.width || (
                //     !opts.aspectRatio ? null :
                //     Math.round((opts.height || meta.width) * opts.aspectRatio)
                // ),
                // height: opts.height || (
                //     !opts.aspectRatio ? null :
                //     Math.round((opts.width || meta.height) / opts.aspectRatio)
                // ),
                width: opts.width ||
                    Math.round((opts.height || meta.width) * (opts.aspectRatio || 1)),
                height: opts.height ||
                    Math.round((opts.width || meta.height) / (opts.aspectRatio || 1)),
                fit: FIT_MAP[opts.fit || 'cover'],
                position: FIT_POSITION_MAP[opts.fit_position || 'centre'],
            });
        }

        // merge
        if (opts.merge) {
            operation.composite([{
                input: opts.merge,
                gravity: FIT_GRAVITY_MAP[opts.merge_position || 'centre'],
                left: Math.round((meta.width * opts.merge_position_x) / 100) || null,
                top: Math.round((meta.height * opts.merge_position_y) / 100) || null,
            }]);
        }

        // misc ?...blur, negate
        if (opts.metadata) {
            operation.withMetadata();
        }

        if (opts.improve) {
            operation
                .sharpen()
                .normalise();
        }

        // transcoding
        if (EXT.includes(opts.format) && opts.format !== 'jpg') {
            operation.toFormat(opts.format, {
                ...EXT_OPTS[opts.format],
                quality: opts.quality,
            });
        }
        return operation;
    });
}

function container(buffer, opts) {
    const command = Sharp(buffer);

    return command.metadata().then((meta) => {
        return command
            .resize({
                width: meta.width > opts.width ? opts.width : null,
                height: meta.height > opts.height ? opts.height : null
            })
            .toBuffer();
    });
}

module.exports = {
    EXT,
    sharp,
    container,
};
