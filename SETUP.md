# Setup Guide

## Quick Start (Demo Mode)

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/second-brain-ai.git
cd second-brain-ai

# Install dependencies
npm run install:all

# Start in demo mode
npm run dev
```

## Full Setup (With Backend)

### 1. Environment Variables
```bash
cd server
cp .env.example .env
```

Edit `.env` file:
```bash
MONGODB_URI=mongodb://localhost:27017/second-brain
OPENAI_API_KEY=your_openai_or_grok_api_key
JWT_SECRET=your_secret_key_here
```

### 2. Start MongoDB
```bash
net start MongoDB
```

### 3. Run Application
```bash
# Development mode
npm run dev

# Production mode
npm run build && npm start
```

## Features

- ✅ **Demo Mode**: Works without backend setup
- ✅ **Document Upload**: Drag & drop file uploads
- ✅ **Smart Search**: AI-powered document search
- ✅ **Chat Interface**: Natural language queries
- ✅ **Multi-modal**: PDF, audio, images, web content
- ✅ **Real-time**: Live processing updates

## Tech Stack

- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Vector Search
- **AI**: OpenAI/Grok API integration
- **Processing**: Bull Queue, Redis