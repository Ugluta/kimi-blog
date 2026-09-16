// Redis/BullMQ kuyruk bağlantıları — API yalnızca iş ÜRETİR, asla render yapmaz
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const convertQueue = new Queue('convert', { connection });
const publishQueue = new Queue('publish', { connection });

module.exports = { connection, convertQueue, publishQueue };
