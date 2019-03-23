const cpus = require('os');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    logs_path: path.join(__dirname, '../', 'logs'),
    is_dev: process.env.NODE_ENV !== 'production',
    max_file_size: process.env.MAX_FILE_SIZE || 100 * 1024 * 1024,
    rate_limit_max_requests: process.env.RATE_LIMIT_MAX_REQUESTS || 33,
    rate_limit_interval: process.env.RATE_LIMIT_INTERVAL || 15 * 60 * 1000,
    uv_threadpool_size: process.env.UV_THREADPOOL_SIZE || cpus.cpus(),
};
