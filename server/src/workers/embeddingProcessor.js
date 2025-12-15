const Document = require('../models/Document');
const openaiService = require('../services/openaiService');
const logger = require('../utils/logger');

const embeddingProcessor = async (job) => {
  const { documentId, userId } = job.data;
  
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    logger.info(`Generating embeddings for document: ${documentId}`);
    
    // Chunk the content
    const chunks = chunkText(document.content, 1000, 200);
    
    // Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.text);
    const embeddings = await openaiService.generateEmbeddings(chunkTexts);
    
    // Create chunk objects with embeddings
    const processedChunks = chunks.map((chunk, index) => ({
      id: `${documentId}_${index}`,
      text: chunk.text,
      embedding: embeddings[index],
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex
    }));

    // Update document with chunks and embeddings
    await Document.findByIdAndUpdate(documentId, {
      chunks: processedChunks,
      indexedAt: new Date()
    });

    return {
      success: true,
      documentId: documentId,
      chunksCreated: processedChunks.length,
      totalTokens: chunkTexts.join(' ').split(' ').length
    };

  } catch (error) {
    logger.error('Embedding processing error:', error);
    
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'failed',
      processingError: `Embedding generation failed: ${error.message}`
    });

    throw error;
  }
};

function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);
    
    // Try to break at sentence boundaries
    if (endIndex < text.length) {
      const lastSentenceEnd = text.lastIndexOf('.', endIndex);
      const lastQuestionEnd = text.lastIndexOf('?', endIndex);
      const lastExclamationEnd = text.lastIndexOf('!', endIndex);
      
      const sentenceEnd = Math.max(lastSentenceEnd, lastQuestionEnd, lastExclamationEnd);
      
      if (sentenceEnd > startIndex + chunkSize * 0.5) {
        endIndex = sentenceEnd + 1;
      }
    }
    
    const chunkText = text.substring(startIndex, endIndex).trim();
    
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        startIndex: startIndex,
        endIndex: endIndex
      });
    }
    
    // Move start index with overlap
    startIndex = endIndex - overlap;
    if (startIndex >= text.length) break;
  }
  
  return chunks;
}

module.exports = embeddingProcessor;