const http = require('http');
const debug = require('debug')('ffactory:server');

const {
    fileStderr,
} = require('./helpers');
const app = require('./app');

function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) return val;
    if (port >= 0) return port;
    return false;
}

const port = normalizePort(process.env.PORT || 3000);

function onError(error) {
    if (error.syscall !== 'listen') throw error;
    switch (error.code) {
        case 'EACCES':
            process.exit(1);
            break;
        case 'EADDRINUSE':
            process.exit(1);
            break;
        default:
            throw error;
    }
}

const server = http.createServer(app.callback());

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${port}` : `port ${port}`;
    debug(`🚀  on ${bind}`);
}

process.on('uncaughtException', (err) => {
    debug('uncaughtException: ', err.message);
    debug(err.stack);
    fileStderr(err.message, 'uncaughtException');
    process.exit(1);
});

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
