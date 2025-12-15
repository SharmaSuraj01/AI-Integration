const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/second-brain', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Create vector search index for embeddings
    await createVectorSearchIndex();
    
  } catch (error) {
    logger.error('Database connection error:', error);
    logger.info('Make sure MongoDB is running: net start MongoDB');
    process.exit(1);
  }
};

const createVectorSearchIndex = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Check if index already exists
    const indexes = await db.collection('documents').indexes();
    const vectorIndexExists = indexes.some(index => 
      index.name && index.name.includes('vector_index')
    );

    if (!vectorIndexExists) {
      logger.info('Creating vector search index...');
      
      // Note: This requires MongoDB Atlas with Vector Search enabled
      // For local development, this will be skipped
      if (process.env.MONGODB_URI.includes('mongodb.net')) {
        await db.collection('documents').createSearchIndex({
          name: 'vector_index',
          definition: {
            fields: [
              {
                type: 'vector',
                path: 'chunks.embedding',
                numDimensions: 1536,
                similarity: 'cosine'
              },
              {
                type: 'filter',
                path: 'userId'
              },
              {
                type: 'filter',
                path: 'contentType'
              },
              {
                type: 'filter',
                path: 'createdAt'
              }
            ]
          }
        });
        
        logger.info('Vector search index created successfully');
      } else {
        logger.info('Local MongoDB detected - skipping vector index creation');
      }
    }
  } catch (error) {
    logger.warn('Vector index creation failed (this is normal for local MongoDB):', error.message);
  }
};

module.exports = connectDB;