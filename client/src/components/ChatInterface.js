import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, ExternalLink } from 'lucide-react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Try backend first, fallback to demo
    try {
      const response = await fetch('http://localhost:5001/api/auth/test');
      if (response.ok) {
        // Backend is running - use real API
        const assistantMessage = {
          role: 'assistant',
          content: 'Backend connected! Real AI functionality is now available.',
          timestamp: new Date(),
          sources: []
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      // Search through documents and provide intelligent responses
      const searchDocumentsAndRespond = (userInput) => {
        const input = userInput.toLowerCase();
        
        // Get documents from localStorage or create demo documents
        const documents = JSON.parse(localStorage.getItem('documents') || '[]');
        
        // Add some demo documents if none exist
        if (documents.length === 0) {
          const demoDocuments = [
            {
              title: 'GLA University Information',
              content: 'GLA University is located in Mathura, Uttar Pradesh. It offers engineering, management, law, and other programs. The university has modern facilities, experienced faculty, and good placement records. Campus life includes various clubs, sports facilities, and cultural events.',
              contentType: 'document',
              tags: ['university', 'education', 'gla']
            },
            {
              title: 'Driving Directions Guide',
              content: 'When planning a drive, always check traffic conditions, fuel levels, and weather. Use GPS navigation for best routes. Keep emergency contacts handy. For long drives, take breaks every 2 hours. Ensure vehicle maintenance is up to date.',
              contentType: 'document', 
              tags: ['driving', 'travel', 'directions']
            },
            {
              title: 'Meeting Notes - Project Alpha',
              content: 'Project Alpha discussion covered timeline, budget allocation, team responsibilities. Key decisions: Launch date set for next quarter, additional resources approved, weekly review meetings scheduled.',
              contentType: 'audio',
              tags: ['meeting', 'project', 'alpha']
            },
            {
              title: 'Resume - Professional Profile',
              content: 'Professional resume containing work experience, technical skills, and project portfolio. Key projects include Aromaverse - a comprehensive fragrance and aromatherapy e-commerce platform with AI-powered recommendations, Second Brain AI - intelligent document management system, and various full-stack web applications. Technical expertise in React.js, Node.js, MongoDB, Python, AI/ML, and cloud technologies.',
              contentType: 'document',
              tags: ['resume', 'cv', 'aromaverse', 'projects', 'skills']
            }
          ];
          localStorage.setItem('documents', JSON.stringify(demoDocuments));
        }
        
        // Search for relevant documents
        const relevantDocs = documents.filter(doc => {
          const searchText = (doc.title + ' ' + doc.content + ' ' + doc.tags.join(' ')).toLowerCase();
          const keywords = input.split(' ').filter(word => word.length > 2);
          return keywords.some(keyword => searchText.includes(keyword));
        });
        
        if (relevantDocs.length > 0) {
          const doc = relevantDocs[0];
          const excerpt = doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : '');
          
          return {
            content: `Based on your documents, here's what I found:\n\n${excerpt}\n\nThis information is from: "${doc.title}"`,
            sources: [{
              title: doc.title,
              contentType: doc.contentType,
              relevanceScore: 0.95
            }]
          };
        }
        
        // Fallback responses for queries without matching documents
        if (input.includes('gla university') || input.includes('gla')) {
          return {
            content: "I don't have specific documents about GLA University in your knowledge base yet. Upload some documents about GLA University and I'll be able to provide detailed information from your personal collection.",
            sources: []
          };
        }
        
        if (input.includes('drive') || input.includes('directions')) {
          return {
            content: "I don't see any documents about driving or directions in your knowledge base. Upload travel guides, maps, or driving instructions and I'll help you find specific information.",
            sources: []
          };
        }
        
        return {
          content: `I searched through your ${documents.length} documents but couldn't find specific information about "${userInput}". Try uploading relevant documents or rephrasing your question with different keywords.`,
          sources: []
        };
      };
      
      setTimeout(() => {
        const searchResult = searchDocumentsAndRespond(input);
        
        const assistantMessage = {
          role: 'assistant',
          content: searchResult.content,
          timestamp: new Date(),
          sources: searchResult.sources
        };

        setMessages(prev => [...prev, assistantMessage]);
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Second Brain Chat</h1>
        <p className="text-sm text-gray-500">Demo Mode - Ask questions to test the interface</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to your Second Brain</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Start a conversation by typing a message. This is a demo interface - 
              connect the backend for full AI functionality.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
              </div>

              {/* Message Content */}
              <div className={`flex-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex mr-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot size={16} className="text-gray-600" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="1"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;