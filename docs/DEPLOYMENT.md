# Deployment Guide

## Prerequisites

### Required Services
- MongoDB Atlas (with Vector Search enabled) or local MongoDB 6.0+
- Redis instance (for job queues)
- OpenAI API key
- Node.js 18+ environment

### Environment Variables

Create `.env` file in the server directory:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/second-brain
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Server
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key

# Client URL (for CORS)
CLIENT_URL=https://your-frontend-domain.com

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Local Development

1. **Install Dependencies**
```bash
npm run install:all
```

2. **Start Development Servers**
```bash
npm run dev
```

This starts both backend (port 5000) and frontend (port 3000) in development mode.

## Production Deployment

### Option 1: Traditional Server Deployment

1. **Build the application**
```bash
cd client && npm run build
cd ../server && npm install --production
```

2. **Start the server**
```bash
cd server && npm start
```

3. **Serve frontend** (using nginx or similar)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/client/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

1. **Create Dockerfile for backend**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

2. **Create docker-compose.yml**
```yaml
version: '3.8'
services:
  app:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  frontend:
    build: ./client
    ports:
      - "80:80"
```

### Option 3: Cloud Platform Deployment

#### Vercel (Frontend) + Railway/Render (Backend)

1. **Deploy Frontend to Vercel**
```bash
cd client
vercel --prod
```

2. **Deploy Backend to Railway**
- Connect GitHub repository
- Set environment variables
- Deploy automatically

#### AWS Deployment

1. **Frontend**: Deploy to S3 + CloudFront
2. **Backend**: Deploy to EC2 or ECS
3. **Database**: Use MongoDB Atlas
4. **Queue**: Use ElastiCache Redis

## Performance Optimization

### Database Indexing
Ensure these indexes are created:
```javascript
// MongoDB indexes
db.documents.createIndex({ userId: 1, createdAt: -1 })
db.documents.createIndex({ userId: 1, contentType: 1 })
db.documents.createIndex({ "chunks.text": "text" })

// Vector search index (Atlas only)
{
  "fields": [
    {
      "type": "vector",
      "path": "chunks.embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

### Caching Strategy
- Redis for session storage
- CDN for static assets
- Application-level caching for frequent queries

### Monitoring
- Application logs with Winston
- Performance monitoring with APM tools
- Database monitoring
- Queue monitoring with Bull Dashboard

## Security Considerations

1. **API Security**
   - Rate limiting implemented
   - JWT token authentication
   - Input validation and sanitization
   - CORS configuration

2. **Data Security**
   - Encryption at rest (MongoDB)
   - TLS in transit
   - Secure file upload validation
   - User data isolation

3. **Infrastructure Security**
   - Environment variable management
   - Secure database connections
   - Regular security updates

## Scaling Considerations

### Horizontal Scaling
- Stateless API design allows multiple server instances
- Load balancer distribution
- Database connection pooling

### Vertical Scaling
- Increase server resources for processing-heavy operations
- Optimize embedding generation batch sizes
- Queue worker scaling

### Database Scaling
- MongoDB sharding by userId
- Read replicas for search operations
- Vector index optimization

## Troubleshooting

### Common Issues

1. **Vector Search Not Working**
   - Ensure MongoDB Atlas Vector Search is enabled
   - Check index configuration
   - Verify embedding dimensions (1536 for OpenAI)

2. **File Upload Failures**
   - Check file size limits
   - Verify upload directory permissions
   - Monitor disk space

3. **Processing Queue Issues**
   - Ensure Redis is running
   - Check worker process status
   - Monitor queue memory usage

4. **OpenAI API Errors**
   - Verify API key validity
   - Check rate limits and quotas
   - Monitor token usage

### Monitoring Commands
```bash
# Check server status
curl http://localhost:5000/health

# Monitor queue status
redis-cli monitor

# Check logs
tail -f logs/combined.log

# Database connection test
mongosh "mongodb://localhost:27017/second-brain"
```