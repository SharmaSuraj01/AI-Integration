const fs = require('fs');
const Tesseract = require('tesseract.js');
const Document = require('../models/Document');
const logger = require('../utils/logger');

const imageProcessor = async (job) => {
  const { documentId, filePath, userId } = job.data;
  
  try {
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'processing'
    });

    logger.info(`Processing image file: ${filePath}`);
    
    // Perform OCR on the image
    const { data: { text, confidence } } = await Tesseract.recognize(
      filePath,
      'eng',
      {
        logger: m => logger.debug('OCR Progress:', m)
      }
    );
    
    // Clean up extracted text
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:()-]/g, '')
      .trim();
    
    if (!cleanedText || cleanedText.length < 10) {
      throw new Error('No meaningful text extracted from image');
    }

    // Update document with OCR results
    const document = await Document.findByIdAndUpdate(documentId, {
      content: cleanedText,
      'metadata.extractedAt': new Date(),
      'metadata.processingDuration': Date.now() - job.timestamp,
      'metadata.confidence': confidence / 100, // Convert to 0-1 scale
      'metadata.wordCount': cleanedText.split(' ').length,
      'metadata.language': 'en',
      processingStatus: 'completed',
      isProcessed: true
    }, { new: true });

    // Clean up temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Queue embedding generation
    const embeddingQueue = require('./processingQueue');
    await embeddingQueue.add('embedding', {
      documentId: document._id,
      userId: userId
    });

    return {
      success: true,
      documentId: document._id,
      textLength: cleanedText.length,
      confidence: confidence
    };

  } catch (error) {
    logger.error('Image processing error:', error);
    
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'failed',
      processingError: error.message
    });

    throw error;
  }
};

module.exports = imageProcessor;