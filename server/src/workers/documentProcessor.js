const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const Document = require('../models/Document');
const logger = require('../utils/logger');

const documentProcessor = async (job) => {
  const { documentId, filePath, mimeType, userId } = job.data;
  
  try {
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'processing'
    });

    logger.info(`Processing document: ${filePath}, type: ${mimeType}`);
    
    let extractedText = '';
    let metadata = {};

    // Extract text based on file type
    if (mimeType === 'application/pdf') {
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(pdfBuffer);
      extractedText = pdfData.text;
      metadata = {
        pages: pdfData.numpages,
        info: pdfData.info
      };
    } 
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docxBuffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      extractedText = result.value;
    }
    else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      extractedText = fs.readFileSync(filePath, 'utf8');
    }
    else {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }

    // Clean and validate extracted text
    extractedText = extractedText.trim();
    if (!extractedText || extractedText.length < 10) {
      throw new Error('No meaningful text extracted from document');
    }

    // Update document with extracted content
    const document = await Document.findByIdAndUpdate(documentId, {
      content: extractedText,
      'metadata.extractedAt': new Date(),
      'metadata.processingDuration': Date.now() - job.timestamp,
      'metadata.wordCount': extractedText.split(' ').length,
      'metadata.language': detectLanguage(extractedText),
      ...metadata,
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
      textLength: extractedText.length,
      wordCount: extractedText.split(' ').length
    };

  } catch (error) {
    logger.error('Document processing error:', error);
    
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'failed',
      processingError: error.message
    });

    throw error;
  }
};

// Simple language detection
function detectLanguage(text) {
  const sample = text.substring(0, 1000).toLowerCase();
  
  // Basic heuristics for common languages
  const patterns = {
    en: /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/g,
    es: /\b(el|la|y|o|pero|en|con|de|para|por)\b/g,
    fr: /\b(le|la|et|ou|mais|dans|sur|avec|de|pour)\b/g,
    de: /\b(der|die|das|und|oder|aber|in|auf|mit|von)\b/g
  };
  
  let maxMatches = 0;
  let detectedLang = 'en';
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = (sample.match(pattern) || []).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedLang = lang;
    }
  }
  
  return detectedLang;
}

module.exports = documentProcessor;