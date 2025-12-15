const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sources: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    chunkId: String,
    relevanceScore: Number,
    title: String
  }],
  metadata: {
    processingTime: Number,
    tokenCount: Number,
    model: String
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ userId: 1, isActive: 1 });

// Virtual for message count
conversationSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Static methods
conversationSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  
  return this.find(query)
    .sort({ updatedAt: -1 })
    .limit(options.limit || 20);
};

// Instance methods
conversationSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.updatedAt = new Date();
  
  // Auto-generate title from first user message
  if (this.messages.length === 1 && messageData.role === 'user') {
    this.title = messageData.content.substring(0, 50) + 
                 (messageData.content.length > 50 ? '...' : '');
  }
  
  return this.save();
};

conversationSchema.methods.getRecentMessages = function(count = 10) {
  return this.messages.slice(-count);
};

module.exports = mongoose.model('Conversation', conversationSchema);