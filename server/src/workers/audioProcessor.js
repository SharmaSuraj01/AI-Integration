const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const openaiService = require('../services/openaiService');
const logger = require('../utils/logger');

const audioProcessor = async (job) => {
  const { documentId, filePath, userId } = job.data;
  
  try {
    // Update processing status
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'processing'
    });

    logger.info(`Processing audio file: ${filePath}`);
    
    // Read audio file
    const audioBuffer = fs.readFileSync(filePath);
    
    // Transcribe using Whisper
    const transcription = await openaiService.transcribeAudio(audioBuffer, {
      language: 'en'
    });
    
    // Update document with transcribed content
    const document = await Document.findByIdAndUpdate(documentId, {
      content: transcription.text,
      'metadata.extractedAt': new Date(),
      'metadata.processingDuration': Date.now() - job.timestamp,
      'metadata.confidence': transcription.confidence || 0.9,
      'metadata.language': transcription.language,
      'metadata.wordCount': transcription.text.split(' ').length,
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
      transcriptionLength: transcription.text.length,
      language: transcription.language
    };

  } catch (error) {
    logger.error('Audio processing error:', error);
    
    // Update document with error status
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'failed',
      processingError: error.message
    });

    throw error;
  }
};

module.exports = audioProcessor;