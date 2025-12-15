# Second Brain AI Companion

🧠 A full-stack AI-powered personal knowledge management system that ingests, processes, and retrieves information from multiple data sources.

## 🚀 Live Demo
[Demo Link](your-deployed-url-here)

## 📸 Screenshots
![Chat Interface](screenshots/chat.png)
![Document Manager](screenshots/documents.png)

## Architecture Overview

### Tech Stack
- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Vector Search
- **AI/ML**: OpenAI GPT-4 + Embeddings
- **Processing**: Bull Queue for async processing
- **Storage**: GridFS for file storage

### Key Features
- Multi-modal data ingestion (Audio, Documents, Web, Text, Images)
- Semantic search with vector embeddings
- Temporal querying support
- Real-time chat interface with streaming responses
- Asynchronous processing pipeline

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6.0+
- OpenAI API Key

### Installation

1. Clone and install dependencies:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

2. Set environment variables:
```bash
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

3. Start the application:
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## System Design

See `docs/SYSTEM_DESIGN.md` for detailed architecture documentation.

## API Documentation

See `docs/API.md` for complete API reference.