const cpus = require('os').cpus();
const cluster = require('cluster');
const debug = require('debug')('ffactory:clusters');

const workerCount = process.env.WORKER_COUNT || cpus;

if (process.env.NODE_ENV === 'production' && cluster.isMaster) {
    workerCount.forEach(() => cluster.fork());

    debug('Master process online with PID %s', process.pid);

    cluster.on('online', (worker) => {
        debug('Worker %s is online', worker.process.pid);
    });

    cluster.on('exit', (worker, code, signal) => {
        debug('Worker %s died with code: %s and signal: %s',
            worker.process.pid, code, signal);
        debug('Starting a new worker');
        cluster.fork();
    });
} else {
    // eslint-disable-next-line
    require('./server'); 
}
