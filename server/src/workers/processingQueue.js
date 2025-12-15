const Queue = require('bull');
const redis = require('redis');
const logger = require('../utils/logger');

// Create Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Create processing queue
const processingQueue = new Queue('document processing', {
  redis: {
    port: 6379,
    host: 'localhost'
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Import processors
const audioProcessor = require('./audioProcessor');
const documentProcessor = require('./documentProcessor');
const webProcessor = require('./webProcessor');
const imageProcessor = require('./imageProcessor');
const embeddingProcessor = require('./embeddingProcessor');

// Process jobs based on type
processingQueue.process('audio', 2, audioProcessor);
processingQueue.process('document', 3, documentProcessor);
processingQueue.process('web', 2, webProcessor);
processingQueue.process('image', 2, imageProcessor);
processingQueue.process('embedding', 5, embeddingProcessor);

// Queue event handlers
processingQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed:`, result);
});

processingQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

processingQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

module.exports = processingQueue;