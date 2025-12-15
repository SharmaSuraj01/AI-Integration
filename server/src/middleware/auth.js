const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-123456789';
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    req.user = user;
    req.startTime = Date.now(); // For performance tracking
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = auth;