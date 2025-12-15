# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST /auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### GET /auth/me
Get current user information. Requires authentication.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "preferences": {
      "defaultLanguage": "en",
      "chunkSize": 1000,
      "chunkOverlap": 200
    },
    "usage": {
      "documentsCount": 15,
      "totalStorageUsed": 1048576,
      "queriesCount": 42
    }
  }
}
```

### Documents

#### GET /documents
Get user's documents with optional filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `contentType` (string): Filter by content type (audio, document, web, text, image)
- `tags` (string): Comma-separated tags to filter by
- `startDate` (string): ISO date string for date range start
- `endDate` (string): ISO date string for date range end

**Response:**
```json
{
  "documents": [
    {
      "_id": "document_id",
      "title": "Meeting Notes",
      "contentType": "audio",
      "processingStatus": "completed",
      "createdAt": "2024-01-15T10:30:00Z",
      "metadata": {
        "wordCount": 1250,
        "language": "en",
        "confidence": 0.95
      },
      "tags": ["meeting", "project-alpha"],
      "chunkCount": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

#### POST /documents/upload
Upload a file for processing.

**Request:** Multipart form data
- `file` (file): The file to upload
- `title` (string, optional): Custom title for the document
- `tags` (string, optional): Comma-separated tags

**Response:**
```json
{
  "documentId": "document_id",
  "title": "uploaded_file.pdf",
  "status": "processing",
  "message": "File uploaded and queued for processing"
}
```

#### POST /documents/url
Add web content from URL.

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "title": "Interesting Article",
  "tags": "research,ai"
}
```

**Response:**
```json
{
  "documentId": "document_id",
  "title": "Interesting Article",
  "status": "processing",
  "message": "URL queued for processing"
}
```

#### POST /documents/text
Add text content directly.

**Request Body:**
```json
{
  "title": "My Notes",
  "content": "This is the text content of my note...",
  "tags": "notes,personal"
}
```

**Response:**
```json
{
  "documentId": "document_id",
  "title": "My Notes",
  "status": "completed",
  "message": "Text content added successfully"
}
```

#### GET /documents/:id
Get specific document details.

**Response:**
```json
{
  "_id": "document_id",
  "title": "Document Title",
  "content": "Full document content...",
  "contentType": "document",
  "source": {
    "type": "upload",
    "originalName": "document.pdf"
  },
  "metadata": {
    "size": 1048576,
    "mimeType": "application/pdf",
    "wordCount": 2500,
    "extractedAt": "2024-01-15T10:35:00Z"
  },
  "chunks": [
    {
      "id": "chunk_id",
      "text": "Chunk content...",
      "startIndex": 0,
      "endIndex": 1000
    }
  ],
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### DELETE /documents/:id
Delete a document.

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

#### GET /documents/:id/status
Get processing status of a document.

**Response:**
```json
{
  "status": "completed",
  "isProcessed": true,
  "error": null
}
```

### Chat

#### GET /chat/conversations
Get user's conversation history.

**Query Parameters:**
- `limit` (number): Number of conversations to return (default: 20)

**Response:**
```json
[
  {
    "_id": "conversation_id",
    "title": "Questions about AI",
    "messageCount": 6,
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T09:15:00Z"
  }
]
```

#### POST /chat/conversations
Create a new conversation.

**Request Body:**
```json
{
  "title": "New Conversation"
}
```

**Response:**
```json
{
  "_id": "conversation_id",
  "title": "New Conversation",
  "messages": [],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### POST /chat/query
Send a message and get AI response.

**Request Body:**
```json
{
  "message": "What did I learn about machine learning last week?",
  "conversationId": "conversation_id"
}
```

**Response:**
```json
{
  "response": "Based on your documents from last week, you learned about...",
  "conversationId": "conversation_id",
  "sources": [
    {
      "documentId": "doc_id",
      "title": "ML Tutorial",
      "relevanceScore": 0.95,
      "contentType": "document"
    }
  ],
  "metadata": {
    "tokensUsed": 150,
    "processingTime": 1250
  }
}
```

#### POST /chat/stream
Send a message and get streaming AI response.

**Request Body:**
```json
{
  "message": "Summarize my recent documents",
  "conversationId": "conversation_id"
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"content": "Based", "type": "chunk"}
data: {"content": " on your", "type": "chunk"}
data: {"content": " recent documents...", "type": "chunk"}
data: {"type": "complete", "conversationId": "conv_id", "sources": [...]}
```

### Search

#### GET /search
General search across user's documents.

**Query Parameters:**
- `q` (string, required): Search query
- `limit` (number): Number of results (default: 10)
- `contentType` (string): Filter by content type
- `startDate` (string): ISO date for date range filtering
- `endDate` (string): ISO date for date range filtering

**Response:**
```json
{
  "results": [
    {
      "documentId": "doc_id",
      "title": "Document Title",
      "contentType": "document",
      "text": "Relevant excerpt from document...",
      "score": 0.95,
      "createdAt": "2024-01-15T10:00:00Z",
      "tags": ["tag1", "tag2"]
    }
  ],
  "totalFound": 5,
  "queryAnalysis": {
    "intent": "search",
    "temporal": "last week",
    "contentTypes": ["document"],
    "entities": ["machine learning"]
  }
}
```

#### POST /search/semantic
Semantic search using vector embeddings.

**Request Body:**
```json
{
  "query": "artificial intelligence concepts",
  "limit": 10,
  "contentType": "document",
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "documentId": "doc_id",
      "title": "AI Fundamentals",
      "text": "Artificial intelligence is...",
      "score": 0.92,
      "chunkId": "chunk_id",
      "type": "vector"
    }
  ],
  "totalFound": 3
}
```

#### GET /search/date-range
Search documents within a specific date range.

**Query Parameters:**
- `startDate` (string, required): ISO date string
- `endDate` (string, required): ISO date string
- `contentType` (string): Filter by content type
- `limit` (number): Number of results (default: 20)

**Response:**
```json
{
  "results": [
    {
      "documentId": "doc_id",
      "title": "Weekly Report",
      "contentType": "document",
      "text": "Document excerpt...",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "totalFound": 8,
  "dateRange": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z"
  }
}
```

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "details": ["Field is required", "Invalid format"]
}
```

### 401 Unauthorized
```json
{
  "error": "Access denied. No token provided."
}
```

### 404 Not Found
```json
{
  "error": "Document not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests from this IP"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **File Upload**: 10 uploads per hour per user
- **Chat Queries**: 50 queries per hour per user

## WebSocket Events

The application uses Socket.IO for real-time updates:

### Client Events
- `join-user-room`: Join user-specific room for notifications

### Server Events
- `processing-started`: Document processing has begun
- `processing-completed`: Document processing finished
- `processing-failed`: Document processing failed