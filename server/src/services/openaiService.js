const OpenAI = require('openai');
const logger = require('../utils/logger');

class OpenAIService {
  constructor() {
    try {
      // Check if using Grok API
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('gsk_')) {
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: 'https://api.x.ai/v1'
        });
        this.isGrok = true;
      } else {
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY || 'dummy-key'
        });
        this.isGrok = false;
      }
    } catch (error) {
      logger.error('OpenAI service initialization error:', error);
      this.client = null;
      this.isGrok = false;
    }
  }

  async generateEmbedding(text) {
    try {
      if (this.isGrok) {
        // Grok doesn't support embeddings, use dummy vector
        const dummyEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
        return dummyEmbedding;
      }
      
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000)
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Embedding error:', error);
      // Fallback to dummy embedding
      const dummyEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
      return dummyEmbedding;
    }
  }

  async generateEmbeddings(texts) {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts.map(text => text.substring(0, 8000))
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      logger.error('OpenAI batch embeddings error:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  async transcribeAudio(audioBuffer, options = {}) {
    try {
      if (this.isGrok) {
        // Grok doesn't support audio transcription
        throw new Error('Audio transcription not supported with Grok API');
      }
      
      const response = await this.client.audio.transcriptions.create({
        file: audioBuffer,
        model: 'whisper-1',
        language: options.language || 'en',
        response_format: 'verbose_json',
        timestamp_granularities: ['word']
      });

      return {
        text: response.text,
        segments: response.words || [],
        language: response.language,
        duration: response.duration
      };
    } catch (error) {
      logger.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async generateResponse(messages, context = [], options = {}) {
    try {
      if (!this.client) {
        return {
          content: 'AI service is not available. Please check your API configuration.',
          usage: { total_tokens: 0 },
          model: 'fallback'
        };
      }

      const systemPrompt = this.buildSystemPrompt(context);
      const conversationMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const model = this.isGrok ? 'grok-beta' : (options.model || 'gpt-4-turbo-preview');
      
      const response = await this.client.chat.completions.create({
        model: model,
        messages: conversationMessages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        stream: options.stream || false
      });

      if (options.stream) {
        return response;
      }

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      logger.error('Chat completion error:', error);
      return {
        content: 'Sorry, I encountered an error. Please try again later.',
        usage: { total_tokens: 0 },
        model: 'error'
      };
    }
  }

  async generateStreamingResponse(messages, context = [], options = {}) {
    const systemPrompt = this.buildSystemPrompt(context);
    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    try {
      const model = this.isGrok ? 'grok-beta' : (options.model || 'gpt-4-turbo-preview');
      
      const stream = await this.client.chat.completions.create({
        model: model,
        messages: conversationMessages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        stream: true
      });

      return stream;
    } catch (error) {
      logger.error('Streaming error:', error);
      throw new Error('Failed to generate streaming response');
    }
  }

  buildSystemPrompt(context) {
    const contextText = context.map(item => 
      `Source: ${item.title || 'Unknown'} (${item.contentType})\n${item.text}`
    ).join('\n\n---\n\n');

    return `You are a helpful AI assistant with access to the user's personal knowledge base. 
Use the provided context to answer questions accurately and comprehensively.

Context from user's documents:
${contextText}

Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain relevant information, say so clearly
- Cite sources when possible by mentioning document titles
- Be concise but thorough
- If asked about temporal information, pay attention to dates and timestamps
- Maintain a conversational and helpful tone`;
  }

  async analyzeQuery(query) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `Analyze the user query and extract:
1. Intent (search, question, command)
2. Temporal keywords (today, yesterday, last week, etc.)
3. Content type hints (document, audio, image, etc.)
4. Key entities and topics

Return as JSON with keys: intent, temporal, contentTypes, entities, keywords`
        }, {
          role: 'user',
          content: query
        }],
        max_tokens: 200,
        temperature: 0.1
      });

      try {
        return JSON.parse(response.choices[0].message.content);
      } catch {
        return {
          intent: 'search',
          temporal: null,
          contentTypes: [],
          entities: [],
          keywords: query.split(' ')
        };
      }
    } catch (error) {
      logger.error('Query analysis error:', error);
      return {
        intent: 'search',
        temporal: null,
        contentTypes: [],
        entities: [],
        keywords: query.split(' ')
      };
    }
  }
}

module.exports = new OpenAIService();