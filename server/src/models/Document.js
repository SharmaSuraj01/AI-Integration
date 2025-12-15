const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  embedding: [{ type: Number }], // 1536-dimensional vector
  startIndex: { type: Number, default: 0 },
  endIndex: { type: Number, default: 0 }
});

const documentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  contentType: { 
    type: String, 
    enum: ['audio', 'document', 'web', 'text', 'image'],
    required: true,
    index: true
  },
  source: {
    type: { 
      type: String, 
      enum: ['upload', 'url', 'manual'],
      required: true 
    },
    originalName: String,
    url: String,
    fileId: mongoose.Schema.Types.ObjectId // GridFS reference
  },
  metadata: {
    size: Number,
    mimeType: String,
    language: { type: String, default: 'en' },
    extractedAt: Date,
    processingDuration: Number,
    wordCount: Number,
    confidence: Number // For OCR/transcription confidence
  },
  chunks: [chunkSchema],
  tags: [{ type: String, index: true }],
  isProcessed: { type: Boolean, default: false },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  indexedAt: Date,
  lastAccessedAt: Date
}, {
  timestamps: true
});

// Indexes for efficient querying
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, contentType: 1 });
documentSchema.index({ userId: 1, tags: 1 });
documentSchema.index({ 'chunks.text': 'text' }); // Text search index

// Virtual for chunk count
documentSchema.virtual('chunkCount').get(function() {
  return this.chunks.length;
});

// Pre-save middleware
documentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('chunks') && this.chunks.length > 0) {
    this.indexedAt = new Date();
  }
  next();
});

// Static methods
documentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.contentType) {
    query.contentType = options.contentType;
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  if (options.dateRange) {
    query.createdAt = {
      $gte: options.dateRange.start,
      $lte: options.dateRange.end
    };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

documentSchema.statics.searchText = function(userId, searchTerm, options = {}) {
  const query = {
    userId,
    $text: { $search: searchTerm }
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Instance methods
documentSchema.methods.updateAccessTime = function() {
  this.lastAccessedAt = new Date();
  return this.save();
};

documentSchema.methods.addChunk = function(chunkData) {
  this.chunks.push({
    id: `${this._id}_${this.chunks.length}`,
    ...chunkData
  });
  return this.save();
};

module.exports = mongoose.model('Document', documentSchema);