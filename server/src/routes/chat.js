const express = require('express');
const Conversation = require('../models/Conversation');
const searchService = require('../services/searchService');
const openaiService = require('../services/openaiService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get user conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.findByUser(req.user.id, {
      limit: parseInt(req.query.limit) || 20
    });
    
    res.json(conversations);
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create new conversation
router.post('/conversations', auth, async (req, res) => {
  try {
    const conversation = new Conversation({
      userId: req.user.id,
      title: req.body.title || 'New Conversation'
    });
    
    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    logger.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Send message and get AI response
router.post('/query', auth, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user.id
      });
    }
    
    if (!conversation) {
      conversation = new Conversation({
        userId: req.user.id,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      });
      await conversation.save();
    }

    // Add user message
    await conversation.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Search for relevant context
    const searchResults = await searchService.hybridSearch(req.user.id, message, {
      limit: 5
    });

    // Prepare context for AI
    const context = searchResults.results.map(result => ({
      title: result.title,
      text: result.text,
      contentType: result.contentType,
      source: result.source
    }));

    // Get recent conversation history
    const recentMessages = conversation.getRecentMessages(10);

    // Generate AI response
    const aiResponse = await openaiService.generateResponse(
      recentMessages.slice(-5), // Last 5 messages for context
      context,
      { maxTokens: 1000 }
    );

    // Add AI message with sources
    await conversation.addMessage({
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      sources: searchResults.results.map(result => ({
        documentId: result.documentId,
        chunkId: result.chunkId,
        relevanceScore: result.finalScore,
        title: result.title
      })),
      metadata: {
        processingTime: Date.now() - req.startTime,
        tokenCount: aiResponse.usage?.total_tokens,
        model: aiResponse.model
      }
    });

    res.json({
      response: aiResponse.content,
      conversationId: conversation._id,
      sources: searchResults.results,
      metadata: {
        tokensUsed: aiResponse.usage?.total_tokens,
        processingTime: Date.now() - req.startTime
      }
    });

  } catch (error) {
    logger.error('Chat query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// Streaming chat endpoint
router.post('/stream', auth, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user.id
      });
    }
    
    if (!conversation) {
      conversation = new Conversation({
        userId: req.user.id,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      });
      await conversation.save();
    }

    // Add user message
    await conversation.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Search for context
    const searchResults = await searchService.hybridSearch(req.user.id, message, {
      limit: 5
    });

    const context = searchResults.results.map(result => ({
      title: result.title,
      text: result.text,
      contentType: result.contentType
    }));

    const recentMessages = conversation.getRecentMessages(10);

    // Generate streaming response
    const stream = await openaiService.generateStreamingResponse(
      recentMessages.slice(-5),
      context
    );

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`);
      }
    }

    // Add complete AI message to conversation
    await conversation.addMessage({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date(),
      sources: searchResults.results.map(result => ({
        documentId: result.documentId,
        chunkId: result.chunkId,
        relevanceScore: result.finalScore,
        title: result.title
      }))
    });

    // Send final metadata
    res.write(`data: ${JSON.stringify({ 
      type: 'complete',
      conversationId: conversation._id,
      sources: searchResults.results
    })}\n\n`);
    
    res.end();

  } catch (error) {
    logger.error('Streaming chat error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process query' })}\n\n`);
    res.end();
  }
});

module.exports = router;