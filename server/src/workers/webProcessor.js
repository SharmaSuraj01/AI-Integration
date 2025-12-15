const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const Document = require('../models/Document');
const logger = require('../utils/logger');

const webProcessor = async (job) => {
  const { documentId, url, userId } = job.data;
  
  try {
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'processing'
    });

    logger.info(`Processing web content: ${url}`);
    
    // Launch browser and scrape content
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    const content = await page.content();
    await browser.close();
    
    // Parse and clean content
    const $ = cheerio.load(content);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
    
    // Extract main content
    let extractedText = '';
    const title = $('title').text().trim() || $('h1').first().text().trim();
    
    // Try to find main content area
    const mainSelectors = ['main', 'article', '.content', '.post', '.entry'];
    let mainContent = null;
    
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 200) {
        mainContent = element;
        break;
      }
    }
    
    if (mainContent) {
      extractedText = mainContent.text();
    } else {
      // Fallback to body content
      extractedText = $('body').text();
    }
    
    // Clean up text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    if (!extractedText || extractedText.length < 100) {
      throw new Error('Insufficient content extracted from webpage');
    }

    // Update document
    const document = await Document.findByIdAndUpdate(documentId, {
      title: title || `Web content from ${new URL(url).hostname}`,
      content: extractedText,
      'metadata.extractedAt': new Date(),
      'metadata.processingDuration': Date.now() - job.timestamp,
      'metadata.wordCount': extractedText.split(' ').length,
      'metadata.language': 'en', // Could add language detection
      processingStatus: 'completed',
      isProcessed: true
    }, { new: true });

    // Queue embedding generation
    const embeddingQueue = require('./processingQueue');
    await embeddingQueue.add('embedding', {
      documentId: document._id,
      userId: userId
    });

    return {
      success: true,
      documentId: document._id,
      textLength: extractedText.length,
      title: title
    };

  } catch (error) {
    logger.error('Web processing error:', error);
    
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'failed',
      processingError: error.message
    });

    throw error;
  }
};

module.exports = webProcessor;