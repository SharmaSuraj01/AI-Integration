import React, { useState, useEffect } from 'react';
import { Upload, Link, FileText, Plus, Trash2, Clock, CheckCircle } from 'lucide-react';

const DocumentManager = () => {
  const [documents, setDocuments] = useState([
    {
      _id: 'demo-1',
      title: 'Sample PDF Document',
      contentType: 'document',
      processingStatus: 'completed',
      createdAt: new Date().toISOString(),
      metadata: { wordCount: 1250, size: 2048576 },
      tags: ['sample', 'pdf'],
      chunks: [{ id: '1' }, { id: '2' }]
    },
    {
      _id: 'demo-2', 
      title: 'Meeting Recording',
      contentType: 'audio',
      processingStatus: 'completed',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      metadata: { wordCount: 800, size: 5242880 },
      tags: ['meeting', 'audio'],
      chunks: [{ id: '1' }]
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState('file');

  const handleFileUpload = (files) => {
    Array.from(files).forEach(file => {
      const newDoc = {
        _id: 'demo-' + Date.now() + Math.random(),
        title: file.name,
        contentType: file.type.startsWith('audio/') ? 'audio' : 
                    file.type.startsWith('image/') ? 'image' : 'document',
        processingStatus: 'processing',
        createdAt: new Date().toISOString(),
        metadata: { size: file.size },
        tags: ['uploaded'],
        chunks: []
      };
      
      setDocuments(prev => {
        const updated = [newDoc, ...prev];
        // Save to localStorage for chat search
        const docsForSearch = updated.map(doc => {
          let content = `Sample content for ${doc.title}. This document contains information about ${doc.tags.join(', ')}.`;
          
          // Add realistic content based on file name
          if (doc.title.toLowerCase().includes('resume') || doc.title.toLowerCase().includes('cv')) {
            content = `Resume/CV Document: Contains professional experience, skills, and projects. Key projects include Aromaverse - a comprehensive fragrance and aromatherapy platform, Second Brain AI - an intelligent document management system, E-commerce solutions, and various web development projects. Skills include React, Node.js, MongoDB, AI/ML, and full-stack development.`;
          } else if (doc.title.toLowerCase().includes('project')) {
            content = `Project documentation containing technical details, implementation notes, and project specifications. Includes information about development process, technologies used, and project outcomes.`;
          }
          
          return {
            title: doc.title,
            content: content,
            contentType: doc.contentType,
            tags: doc.tags
          };
        });
        localStorage.setItem('documents', JSON.stringify(docsForSearch));
        return updated;
      });
      
      // Simulate processing
      setTimeout(() => {
        setDocuments(prev => prev.map(doc => 
          doc._id === newDoc._id 
            ? { ...doc, processingStatus: 'completed', metadata: { ...doc.metadata, wordCount: Math.floor(Math.random() * 1000) + 100 } }
            : doc
        ));
      }, 2000);
    });
    
    setShowUpload(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => prev.filter(doc => doc._id !== id));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'processing': return <Clock size={16} className="text-yellow-600 animate-spin" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
            <p className="text-sm text-gray-500">Demo Mode - File uploads simulated</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Content</span>
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Content</h3>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setUploadType('file')}
                  className={`flex-1 py-2 px-4 rounded-lg border ${
                    uploadType === 'file' ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                  }`}
                >
                  <Upload size={16} className="mx-auto mb-1" />
                  <div className="text-sm">Upload File</div>
                </button>
                <button
                  onClick={() => setUploadType('url')}
                  className={`flex-1 py-2 px-4 rounded-lg border ${
                    uploadType === 'url' ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                  }`}
                >
                  <Link size={16} className="mx-auto mb-1" />
                  <div className="text-sm">Web URL</div>
                </button>
                <button
                  onClick={() => setUploadType('text')}
                  className={`flex-1 py-2 px-4 rounded-lg border ${
                    uploadType === 'text' ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                  }`}
                >
                  <FileText size={16} className="mx-auto mb-1" />
                  <div className="text-sm">Text Note</div>
                </button>
              </div>

              {uploadType === 'file' && (
                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400"
                >
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600">
                      Drag & drop files here, or click to select
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Demo mode: Files will be simulated
                    </p>
                  </label>
                </div>
              )}

              {uploadType === 'url' && (
                <div className="space-y-3">
                  <input
                    type="url"
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      const newDoc = {
                        _id: 'demo-url-' + Date.now(),
                        title: 'Web Article Demo',
                        contentType: 'web',
                        processingStatus: 'processing',
                        createdAt: new Date().toISOString(),
                        metadata: { size: 0 },
                        tags: ['web', 'demo']
                      };
                      setDocuments(prev => [newDoc, ...prev]);
                      setTimeout(() => {
                        setDocuments(prev => prev.map(doc => 
                          doc._id === newDoc._id 
                            ? { ...doc, processingStatus: 'completed', metadata: { wordCount: 750 } }
                            : doc
                        ));
                      }, 1500);
                      setShowUpload(false);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add URL (Demo)
                  </button>
                </div>
              )}

              {uploadType === 'text' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Note title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <textarea
                    placeholder="Enter your text content..."
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      const newDoc = {
                        _id: 'demo-text-' + Date.now(),
                        title: 'Text Note Demo',
                        contentType: 'text',
                        processingStatus: 'completed',
                        createdAt: new Date().toISOString(),
                        metadata: { wordCount: 150 },
                        tags: ['note', 'demo']
                      };
                      setDocuments(prev => [newDoc, ...prev]);
                      setShowUpload(false);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Note (Demo)
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div key={doc._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{doc.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {doc.contentType} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                    <span className={`px-2 py-1 rounded-full flex items-center space-x-1 ${getStatusColor(doc.processingStatus)}`}>
                      {getStatusIcon(doc.processingStatus)}
                      <span>{doc.processingStatus}</span>
                    </span>
                    {doc.metadata?.wordCount && (
                      <span>{doc.metadata.wordCount} words</span>
                    )}
                    {doc.chunks?.length > 0 && (
                      <span>{doc.chunks.length} chunks</span>
                    )}
                    {doc.metadata?.size && (
                      <span>{(doc.metadata.size / 1024 / 1024).toFixed(1)} MB</span>
                    )}
                  </div>

                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;