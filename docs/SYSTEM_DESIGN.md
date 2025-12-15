# Second Brain AI Companion - System Design Document

## 1. System Overview

The Second Brain AI Companion is a personal knowledge management system that ingests, processes, and retrieves information from multiple data sources using advanced AI techniques.

### 1.1 Architecture Principles
- **Microservices-oriented**: Modular, scalable components
- **Event-driven**: Asynchronous processing with message queues
- **AI-first**: Vector embeddings and semantic search at the core
- **Privacy-focused**: User data isolation and encryption
- **Temporal-aware**: Time-based indexing and querying

## 2. Multi-Modal Data Ingestion Pipeline

### 2.1 Supported Data Types
- **Audio**: MP3, M4A, WAV (transcribed via Whisper API)
- **Documents**: PDF, MD, TXT, DOCX (text extraction)
- **Web Content**: URL scraping with content extraction
- **Plain Text**: Direct text input and notes
- **Images**: JPEG, PNG with OCR and metadata extraction

### 2.2 Processing Pipeline Architecture

```
[Data Input] → [Validation] → [Queue] → [Processing Workers] → [Embedding] → [Storage]
     ↓              ↓           ↓            ↓               ↓          ↓
  File Upload   Format Check  Bull Queue   Extract Text   OpenAI API  MongoDB
  URL Submit    Size Limits   Redis        Transcribe     Embeddings  GridFS
  Text Input    Type Check    Async Jobs   OCR Process    Chunking    Vector Index
```

### 2.3 Processing Workers
- **AudioProcessor**: Whisper API integration for transcription
- **DocumentProcessor**: PDF parsing, text extraction
- **WebProcessor**: Puppeteer-based scraping with content cleaning
- **ImageProcessor**: OCR with Tesseract, metadata extraction
- **EmbeddingProcessor**: Text chunking and vector generation

## 3. Information Retrieval & Querying Strategy

### 3.1 Hybrid Search Approach
We implement a **hybrid retrieval system** combining:

1. **Semantic Search (Primary)**: Vector similarity using OpenAI embeddings
2. **Keyword Search (Secondary)**: MongoDB text search for exact matches
3. **Temporal Filtering**: Time-based relevance scoring
4. **Metadata Filtering**: Source type, tags, and user-defined categories

### 3.2 Query Processing Flow

```
[User Query] → [Query Analysis] → [Multi-Search] → [Ranking] → [Context Assembly] → [LLM Response]
      ↓              ↓              ↓            ↓              ↓                ↓
  Natural Lang   Intent Extract   Vector +     Relevance     Top-K Results    GPT-4 API
  Input Text     Temporal Hints   Text Search  Scoring       with Metadata    Synthesis
```

### 3.3 Relevance Scoring Algorithm
```javascript
relevanceScore = (
  0.6 * vectorSimilarity +
  0.2 * keywordMatch +
  0.1 * temporalRelevance +
  0.1 * sourceReliability
)
```

## 4. Data Indexing & Storage Model

### 4.1 Database Schema Design

#### Documents Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: String,
  content: String,
  contentType: String, // 'audio', 'document', 'web', 'text', 'image'
  source: {
    type: String, // 'upload', 'url', 'manual'
    originalName: String,
    url: String,
    fileId: ObjectId // GridFS reference
  },
  metadata: {
    size: Number,
    mimeType: String,
    language: String,
    extractedAt: Date,
    processingDuration: Number
  },
  chunks: [{
    id: String,
    text: String,
    embedding: [Number], // 1536-dimensional vector
    startIndex: Number,
    endIndex: Number
  }],
  tags: [String],
  createdAt: Date,
  updatedAt: Date,
  indexedAt: Date
}
```

#### Conversations Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  messages: [{
    role: String, // 'user' | 'assistant'
    content: String,
    timestamp: Date,
    sources: [ObjectId] // Referenced documents
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 Vector Index Configuration
```javascript
// MongoDB Atlas Vector Search Index
{
  "fields": [
    {
      "type": "vector",
      "path": "chunks.embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "userId"
    },
    {
      "type": "filter", 
      "path": "contentType"
    },
    {
      "type": "filter",
      "path": "createdAt"
    }
  ]
}
```

### 4.3 Chunking Strategy
- **Text Documents**: 1000 characters with 200-character overlap
- **Audio Transcripts**: Sentence-based chunking with speaker detection
- **Web Content**: Paragraph-based with heading preservation
- **Images**: OCR text + metadata as single chunk

## 5. Temporal Querying Support

### 5.1 Time-Based Indexing
All documents include multiple temporal markers:
- `createdAt`: Original creation/upload time
- `contentDate`: Extracted date from content (meetings, articles)
- `indexedAt`: Processing completion time
- `lastAccessedAt`: Query usage tracking

### 5.2 Temporal Query Processing
```javascript
// Example temporal queries
"What did I work on last week?" → 
  Filter: createdAt >= (now - 7 days)
  
"Summarize the meeting from Tuesday" →
  Filter: contentType = 'audio' AND 
          contentDate >= tuesday_start AND 
          contentDate <= tuesday_end
```

### 5.3 Time-Decay Relevance
Recent documents receive relevance boost:
```javascript
temporalRelevance = Math.exp(-daysSinceCreation / 30) // 30-day half-life
```

## 6. Scalability and Privacy

### 6.1 Scalability Design
- **Horizontal Scaling**: Stateless API servers behind load balancer
- **Database Sharding**: User-based sharding for MongoDB
- **Caching Layer**: Redis for frequent queries and embeddings
- **CDN Integration**: Static file delivery optimization
- **Queue Scaling**: Multiple worker processes for processing pipeline

### 6.2 Privacy Architecture
- **Data Isolation**: Strict user-based data segregation
- **Encryption**: AES-256 for data at rest, TLS 1.3 for transit
- **Local-First Option**: Embedded vector database (Chroma/Qdrant)
- **API Key Management**: User-provided OpenAI keys (optional)
- **Audit Logging**: Complete access and modification tracking

### 6.3 Trade-offs Analysis

#### Cloud vs Local-First
| Aspect | Cloud-Hosted | Local-First |
|--------|-------------|-------------|
| **Performance** | High (dedicated resources) | Variable (device dependent) |
| **Privacy** | Requires trust | Complete control |
| **Scalability** | Unlimited | Hardware limited |
| **Maintenance** | Managed | User responsibility |
| **Cost** | Subscription model | One-time + hardware |

#### Storage Solutions Comparison
| Solution | Pros | Cons | Use Case |
|----------|------|------|---------|
| **MongoDB + Vector Search** | Unified storage, ACID transactions | Vendor lock-in, cost | Production deployment |
| **PostgreSQL + pgvector** | Open source, mature | Complex setup | Self-hosted |
| **Pinecone + PostgreSQL** | Specialized vector DB | Additional service | High-scale vector ops |

## 7. API Design

### 7.1 Core Endpoints
```
POST /api/documents/upload     # Multi-modal file upload
POST /api/documents/url        # Web content ingestion  
GET  /api/documents           # List user documents
DELETE /api/documents/:id     # Remove document

POST /api/chat/query          # Q&A endpoint
GET  /api/chat/conversations  # Chat history
POST /api/chat/stream         # Streaming responses

GET  /api/search              # Advanced search
POST /api/search/semantic     # Vector similarity search
```

### 7.2 WebSocket Integration
Real-time updates for:
- Processing status notifications
- Streaming chat responses
- Live search suggestions

## 8. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- MongoDB setup with vector indexing
- Basic CRUD API for documents
- File upload and storage system
- Authentication and user management

### Phase 2: Processing Pipeline (Week 2)  
- Audio transcription (Whisper API)
- Document text extraction
- Embedding generation and storage
- Async job processing with Bull

### Phase 3: Search & Retrieval (Week 3)
- Vector similarity search
- Hybrid search implementation
- Temporal query support
- Relevance scoring algorithm

### Phase 4: AI Integration (Week 4)
- OpenAI GPT-4 integration
- Context assembly and prompt engineering
- Streaming response implementation
- Chat history management

### Phase 5: Frontend & UX (Week 5)
- React chat interface
- File upload components
- Search and filter UI
- Real-time updates

This architecture provides a robust foundation for a scalable, privacy-conscious AI companion that can grow with user needs while maintaining high performance and accuracy.