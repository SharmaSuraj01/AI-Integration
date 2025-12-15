const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const processingQueue = require('../workers/processingQueue');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a',
      'application/pdf', 'text/plain', 'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Get user documents
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      contentType,
      tags,
      startDate,
      endDate
    } = req.query;

    const options = {
      limit: parseInt(limit),
      contentType,
      tags: tags ? tags.split(',') : undefined
    };

    if (startDate && endDate) {
      options.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const documents = await Document.findByUser(req.user.id, options);
    
    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: documents.length
      }
    });
  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Upload file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, tags } = req.body;
    
    // Determine content type based on mime type
    let contentType;
    if (req.file.mimetype.startsWith('audio/')) {
      contentType = 'audio';
    } else if (req.file.mimetype.startsWith('image/')) {
      contentType = 'image';
    } else {
      contentType = 'document';
    }

    // Create document record
    const document = new Document({
      userId: req.user.id,
      title: title || req.file.originalname,
      content: '', // Will be filled by processor
      contentType,
      source: {
        type: 'upload',
        originalName: req.file.originalname
      },
      metadata: {
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      processingStatus: 'pending'
    });

    await document.save();

    // Queue for processing
    await processingQueue.add(contentType, {
      documentId: document._id,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      userId: req.user.id
    });

    // Emit processing started event
    req.io.to(`user-${req.user.id}`).emit('processing-started', {
      documentId: document._id,
      title: document.title
    });

    res.status(201).json({
      documentId: document._id,
      title: document.title,
      status: 'processing',
      message: 'File uploaded and queued for processing'
    });

  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Add URL content
router.post('/url', auth, async (req, res) => {
  try {
    const { url, title, tags } = req.body;
    
    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    // Create document record
    const document = new Document({
      userId: req.user.id,
      title: title || `Web content from ${new URL(url).hostname}`,
      content: '', // Will be filled by processor
      contentType: 'web',
      source: {
        type: 'url',
        url: url
      },
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      processingStatus: 'pending'
    });

    await document.save();

    // Queue for processing
    await processingQueue.add('web', {
      documentId: document._id,
      url: url,
      userId: req.user.id
    });

    req.io.to(`user-${req.user.id}`).emit('processing-started', {
      documentId: document._id,
      title: document.title
    });

    res.status(201).json({
      documentId: document._id,
      title: document.title,
      status: 'processing',
      message: 'URL queued for processing'
    });

  } catch (error) {
    logger.error('URL processing error:', error);
    res.status(500).json({ error: 'Failed to process URL' });
  }
});

// Add text content
router.post('/text', auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Create document record
    const document = new Document({
      userId: req.user.id,
      title: title || 'Text Note',
      content: content.trim(),
      contentType: 'text',
      source: {
        type: 'manual'
      },
      metadata: {
        size: content.length,
        mimeType: 'text/plain',
        wordCount: content.split(' ').length,
        extractedAt: new Date()
      },
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      processingStatus: 'completed',
      isProcessed: true
    });

    await document.save();

    // Queue for embedding generation
    await processingQueue.add('embedding', {
      documentId: document._id,
      userId: req.user.id
    });

    res.status(201).json({
      documentId: document._id,
      title: document.title,
      status: 'completed',
      message: 'Text content added successfully'
    });

  } catch (error) {
    logger.error('Text content error:', error);
    res.status(500).json({ error: 'Failed to add text content' });
  }
});

// Get document by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update access time
    await document.updateAccessTime();

    res.json(document);
  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Get processing status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).select('processingStatus processingError isProcessed');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      status: document.processingStatus,
      isProcessed: document.isProcessed,
      error: document.processingError
    });
  } catch (error) {
    logger.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get processing status' });
  }
});

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = router;