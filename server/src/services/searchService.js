const Document = require('../models/Document');
const openaiService = require('./openaiService');
const logger = require('../utils/logger');

class SearchService {
  async hybridSearch(userId, query, options = {}) {
    try {
      // Analyze query for better search strategy
      const queryAnalysis = await openaiService.analyzeQuery(query);
      
      // Generate embedding for semantic search
      const queryEmbedding = await openaiService.generateEmbedding(query);
      
      // Perform parallel searches
      const [vectorResults, textResults] = await Promise.all([
        this.vectorSearch(userId, queryEmbedding, options),
        this.textSearch(userId, query, options)
      ]);
      
      // Combine and rank results
      const combinedResults = this.combineResults(
        vectorResults, 
        textResults, 
        queryAnalysis,
        options
      );
      
      return {
        results: combinedResults,
        totalFound: combinedResults.length,
        queryAnalysis
      };
    } catch (error) {
      logger.error('Hybrid search error:', error);
      throw new Error('Search failed');
    }
  }

  async vectorSearch(userId, queryEmbedding, options = {}) {
    try {
      // Build aggregation pipeline for vector search
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'chunks.embedding',
            queryVector: queryEmbedding,
            numCandidates: options.numCandidates || 100,
            limit: options.limit || 20,
            filter: {
              userId: userId,
              ...(options.contentType && { contentType: options.contentType }),
              ...(options.dateRange && {
                createdAt: {
                  $gte: options.dateRange.start,
                  $lte: options.dateRange.end
                }
              })
            }
          }
        },
        {
          $addFields: {
            score: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $unwind: '$chunks'
        },
        {
          $match: {
            'chunks.embedding': { $exists: true }
          }
        },
        {
          $project: {
            title: 1,
            contentType: 1,
            source: 1,
            createdAt: 1,
            tags: 1,
            chunk: '$chunks',
            score: 1
          }
        },
        {
          $sort: { score: -1 }
        }
      ];

      // Fallback for local MongoDB without vector search
      if (!process.env.MONGODB_URI.includes('mongodb.net')) {
        return this.fallbackVectorSearch(userId, queryEmbedding, options);
      }

      const results = await Document.aggregate(pipeline);
      
      return results.map(result => ({
        documentId: result._id,
        title: result.title,
        contentType: result.contentType,
        text: result.chunk.text,
        chunkId: result.chunk.id,
        score: result.score,
        source: result.source,
        createdAt: result.createdAt,
        tags: result.tags,
        type: 'vector'
      }));
    } catch (error) {
      logger.error('Vector search error:', error);
      return [];
    }
  }

  async fallbackVectorSearch(userId, queryEmbedding, options = {}) {
    try {
      // Simple cosine similarity calculation for local development
      const documents = await Document.find({
        userId,
        'chunks.embedding': { $exists: true },
        ...(options.contentType && { contentType: options.contentType }),
        ...(options.dateRange && {
          createdAt: {
            $gte: options.dateRange.start,
            $lte: options.dateRange.end
          }
        })
      }).limit(100);

      const results = [];
      
      for (const doc of documents) {
        for (const chunk of doc.chunks) {
          if (chunk.embedding && chunk.embedding.length > 0) {
            const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
            
            if (similarity > 0.7) { // Threshold for relevance
              results.push({
                documentId: doc._id,
                title: doc.title,
                contentType: doc.contentType,
                text: chunk.text,
                chunkId: chunk.id,
                score: similarity,
                source: doc.source,
                createdAt: doc.createdAt,
                tags: doc.tags,
                type: 'vector'
              });
            }
          }
        }
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit || 20);
    } catch (error) {
      logger.error('Fallback vector search error:', error);
      return [];
    }
  }

  async textSearch(userId, query, options = {}) {
    try {
      const searchResults = await Document.searchText(userId, query, {
        limit: options.limit || 20
      });

      return searchResults.map(doc => ({
        documentId: doc._id,
        title: doc.title,
        contentType: doc.contentType,
        text: this.extractRelevantText(doc.content, query),
        score: doc.score || 0.5,
        source: doc.source,
        createdAt: doc.createdAt,
        tags: doc.tags,
        type: 'text'
      }));
    } catch (error) {
      logger.error('Text search error:', error);
      return [];
    }
  }

  combineResults(vectorResults, textResults, queryAnalysis, options = {}) {
    const resultMap = new Map();
    
    // Add vector results with higher weight
    vectorResults.forEach(result => {
      const key = `${result.documentId}_${result.chunkId || 'full'}`;
      result.finalScore = result.score * 0.7; // Vector search weight
      resultMap.set(key, result);
    });
    
    // Add text results with lower weight, merge if duplicate
    textResults.forEach(result => {
      const key = `${result.documentId}_full`;
      if (resultMap.has(key)) {
        const existing = resultMap.get(key);
        existing.finalScore += result.score * 0.3; // Text search weight
      } else {
        result.finalScore = result.score * 0.3;
        resultMap.set(key, result);
      }
    });
    
    // Apply temporal boost if query has temporal elements
    if (queryAnalysis.temporal) {
      this.applyTemporalBoost(Array.from(resultMap.values()), queryAnalysis.temporal);
    }
    
    // Sort by final score and apply limit
    return Array.from(resultMap.values())
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, options.limit || 10);
  }

  applyTemporalBoost(results, temporalHint) {
    const now = new Date();
    const boostFactors = {
      'today': 1,
      'yesterday': 2,
      'this week': 7,
      'last week': 14,
      'this month': 30,
      'last month': 60
    };
    
    const daysBack = boostFactors[temporalHint.toLowerCase()] || 365;
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    results.forEach(result => {
      if (result.createdAt >= cutoffDate) {
        const daysSince = (now - result.createdAt) / (24 * 60 * 60 * 1000);
        const temporalBoost = Math.exp(-daysSince / 30); // 30-day half-life
        result.finalScore *= (1 + temporalBoost);
      }
    });
  }

  extractRelevantText(content, query, maxLength = 300) {
    const queryWords = query.toLowerCase().split(' ');
    const sentences = content.split(/[.!?]+/);
    
    // Find sentences containing query words
    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return queryWords.some(word => lowerSentence.includes(word));
    });
    
    if (relevantSentences.length === 0) {
      return content.substring(0, maxLength) + '...';
    }
    
    const excerpt = relevantSentences.slice(0, 2).join('. ');
    return excerpt.length > maxLength 
      ? excerpt.substring(0, maxLength) + '...'
      : excerpt;
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async searchByDateRange(userId, startDate, endDate, options = {}) {
    try {
      const documents = await Document.findByUser(userId, {
        dateRange: { start: startDate, end: endDate },
        ...options
      });

      return documents.map(doc => ({
        documentId: doc._id,
        title: doc.title,
        contentType: doc.contentType,
        text: doc.content.substring(0, 300) + '...',
        source: doc.source,
        createdAt: doc.createdAt,
        tags: doc.tags,
        type: 'temporal'
      }));
    } catch (error) {
      logger.error('Date range search error:', error);
      throw new Error('Date range search failed');
    }
  }
}

module.exports = new SearchService();