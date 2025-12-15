import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChatInterface from './components/ChatInterface';
import DocumentManager from './components/DocumentManager';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState('chat');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Skip login for now - direct access
  // if (!user) {
  //   return <Login />;
  // }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeView={activeView} setActiveView={setActiveView} user={{name: 'Demo User', email: 'demo@test.com'}} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' && <ChatInterface />}
        {activeView === 'documents' && <DocumentManager />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;