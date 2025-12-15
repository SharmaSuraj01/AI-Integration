const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();

app.use(cors());
app.use(express.json());

// File upload setup
const upload = multer({ dest: 'uploads/' });

app.get('/test', (req, res) => {
  res.json({ message: 'Server working!' });
});

app.post('/api/auth/login', (req, res) => {
  console.log('Login request:', req.body);
  res.json({ 
    token: 'dummy-token',
    user: { id: '1', name: 'Test', email: 'test@test.com' }
  });
});

// File upload endpoint
app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  console.log('File upload:', req.file);
  res.json({
    documentId: 'demo-doc-' + Date.now(),
    title: req.file?.originalname || 'Demo Document',
    status: 'completed',
    message: 'File uploaded successfully (demo mode)'
  });
});

// Get documents
app.get('/api/documents', (req, res) => {
  res.json({
    documents: [
      {
        _id: 'demo-1',
        title: 'Demo Document 1',
        contentType: 'document',
        processingStatus: 'completed',
        createdAt: new Date().toISOString(),
        metadata: { wordCount: 500 },
        tags: ['demo']
      }
    ],
    pagination: { page: 1, limit: 20, total: 1 }
  });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});