const express = require('express');
const searchService = require('../services/searchService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// General search endpoint
router.get('/', auth, async (req, res) => {
  try {
    const { q: query, limit = 10, contentType, startDate, endDate } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const options = {
      limit: parseInt(limit),
      contentType,
      dateRange: startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined
    };

    const results = await searchService.hybridSearch(req.user.id, query, options);
    
    res.json(results);
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Semantic search endpoint
router.post('/semantic', auth, async (req, res) => {
  try {
    const { query, limit = 10, contentType, dateRange } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const options = {
      limit: parseInt(limit),
      contentType,
      dateRange: dateRange ? {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      } : undefined
    };

    const results = await searchService.hybridSearch(req.user.id, query, options);
    
    res.json(results);
  } catch (error) {
    logger.error('Semantic search error:', error);
    res.status(500).json({ error: 'Semantic search failed' });
  }
});

// Date range search
router.get('/date-range', auth, async (req, res) => {
  try {
    const { startDate, endDate, contentType, limit = 20 } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const options = {
      limit: parseInt(limit),
      contentType
    };

    const results = await searchService.searchByDateRange(
      req.user.id,
      new Date(startDate),
      new Date(endDate),
      options
    );
    
    res.json({
      results,
      totalFound: results.length,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Date range search error:', error);
    res.status(500).json({ error: 'Date range search failed' });
  }
});

module.exports = router;