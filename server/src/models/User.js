const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  preferences: {
    defaultLanguage: { type: String, default: 'en' },
    chunkSize: { type: Number, default: 1000 },
    chunkOverlap: { type: Number, default: 200 },
    maxFileSize: { type: Number, default: 50 * 1024 * 1024 }, // 50MB
    enabledContentTypes: {
      type: [String],
      default: ['audio', 'document', 'web', 'text', 'image']
    }
  },
  usage: {
    documentsCount: { type: Number, default: 0 },
    totalStorageUsed: { type: Number, default: 0 },
    queriesCount: { type: Number, default: 0 },
    lastActiveAt: Date
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update usage statistics
userSchema.methods.updateUsage = function(updates) {
  Object.assign(this.usage, updates);
  this.usage.lastActiveAt = new Date();
  return this.save();
};

// Get user preferences
userSchema.methods.getPreferences = function() {
  return this.preferences;
};

module.exports = mongoose.model('User', userSchema);