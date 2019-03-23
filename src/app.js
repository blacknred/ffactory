const Koa = require('koa');
const cors = require('kcors');
const body = require('koa-body');
const helmet = require('koa-helmet');
const logger = require('koa-logger');
const limiter = require('koa2-ratelimit');
const Path = require('path');
const stream = require('stream');
const exists = require('fs').existsSync;

const {
    processor,
    PROCESSABLE_EXT,
} = require('./processor');
const config = require('../config');
const helpers = require('./helpers');

const OPTS = {
    body: {
        multipart: true,
        formidable: {
            maxFileSize: config.max_file_size,
        },
    },
    ratelimit: {
        interval: config.rate_limit_interval,
        max: config.rate_limit_max_requests,
        delayAfter: 10,
        timeWait: 3 * 1000,
        // skip: () => {}, check api plan token
        message: 'Too many requests, please try again after',
    },
};

const app = new Koa();

/* Cors */
app.use(cors());

/* Prevent bruteforce */
app.use(helmet());

/* Ratelimit */
app.use(limiter.RateLimit.middleware(OPTS.ratelimit));

/* Bodyparser */
app.use(body(OPTS.body));

/* Logger */
app.use(logger());

/* Errors */
app.use(async (ctx, next) => {
    try {
        await next();

        const status = ctx.status || 404;

        if (status === 404) {
            ctx.throw(404, 'Not Found');
        }
    } catch (err) {
        ctx.status = err.status || 500;

        if (config.is_dev && ctx.status === 500) {
            helpers.fileStderr(err.message);
        }

        ctx.body = {
            status: 'error',
            message: err.message
        };
    }
});


// 

module.exports = app;


/* On fly processing */

app.use(async (ctx, next) => {
    const urlParts = url.parse(ctx.originalUrl, true);

    if (urlParts.query.d || urlParts.query.download) {
        ctx.attachment(urlParts.pathname);
        delete (urlParts.query.d || urlParts.query.download);
    }

    if (Object.keys(urlParts.query).length) {
        const parsed = Path.parse(urlParts.pathname);
        const ext = parsed.ext.slice(1);

        if (PROCESSABLE_EXT.includes(ext)) {
            const path = Path.join(config.static_path, urlParts.pathname);

            if (!ctx.accepts(ext)) {
                ctx.throw(406);
            }

            ctx.type = ext;

            if (ctx.response.get('Content-Disposition') &&
                PROCESSABLE_EXT.includes(urlParts.query.f)) {
                    ctx.attachment(`${parsed.name}.${urlParts.query.f}`);
            }

            if (exists(path)) {
                ctx.body = stream.PassThrough();
                (await processor(path, urlParts.query, ext, true)).pipe(ctx.body);

                // ctx.respond = false;
                // (processor(path, urlParts.query, ext, true)).pipe(ctx.res);
            }
        }
    }
    // download prevent Output stream closed

    await next();
});