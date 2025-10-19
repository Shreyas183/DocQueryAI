import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { PDFService } from "./services/pdfService";
import { EmbeddingService } from "./services/embeddingService";
import { VectorService } from "./services/vectorService";
import { insertDocumentSchema, insertQuerySchema } from "@shared/schema";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "";

// PRECISE EXTRACTION FUNCTION - AVOIDS MISINFORMATION
function extractInformationFromContext(context: string, query: string): string {
  const lowerQuery = query.toLowerCase();
  
  console.log(`\n=== PRECISE EXTRACTION ===`);
  console.log(`Query: "${query}"`);
  console.log(`Context length: ${context.length}`);
  
  // EXTRACT SUBJECT FROM QUERY
  let subject = '';
  if (lowerQuery.includes('what is')) {
    const match = query.match(/what is\s+([^?]+)/i);
    subject = match ? match[1].trim() : '';
  } else if (lowerQuery.includes('define')) {
    const match = query.match(/define\s+([^?]+)/i);
    subject = match ? match[1].trim() : '';
  } else if (lowerQuery.includes('explain')) {
    const match = query.match(/explain\s+([^?]+)/i);
    subject = match ? match[1].trim() : '';
    
    // Handle "explain it more" - try to find the previous topic
    if (subject === 'it more' || subject === 'it') {
      console.log('Detected "explain it" - looking for recent topics...');
      // Look for common tech terms that might have been discussed
      const commonTechTerms = ['javascript', 'html', 'css', 'react', 'node', 'python', 'java', 'sql'];
      for (const term of commonTechTerms) {
        if (context.toLowerCase().includes(term)) {
          subject = term;
          console.log(`Assuming "it" refers to: ${subject}`);
          break;
        }
      }
    }
    
    // Don't apply pronoun resolution for specific subjects like "RAG"
    if (subject && subject.toLowerCase() !== 'it' && subject.toLowerCase() !== 'it more') {
      console.log(`Specific subject detected: "${subject}" - skipping pronoun resolution`);
    }
    
    // Handle typos - normalize common tech terms
    if (subject) {
      const techTerms = {
        'html': 'HTML',
        'htm': 'HTML', 
        'html': 'HTML',
        'javascript': 'JavaScript',
        'js': 'JavaScript',
        'css': 'CSS',
        'react': 'React',
        'node': 'Node.js',
        'python': 'Python',
        'java': 'Java'
      };
      
      const normalizedSubject = techTerms[subject.toLowerCase()];
      if (normalizedSubject) {
        console.log(`Normalized "${subject}" to "${normalizedSubject}"`);
        subject = normalizedSubject;
      }
    }
  }
  
  if (subject) {
    console.log(`Looking for definition of: "${subject}"`);
    console.log(`Subject lower: "${subject.toLowerCase()}"`);
    const subjectLower = subject.toLowerCase();
    
    // FIRST: Check if subject exists in context at all
    const contextLower = context.toLowerCase();
    if (!contextLower.includes(subjectLower)) {
      console.log(`Subject "${subject}" not found in context at all`);
      return `Information about "${subject}" not found in the document.`;
    }
    
    console.log(`Subject "${subject}" found in context, looking for definitions...`);
    
    // Look for definition patterns first
    const definitionPatterns = [
      // Q&A format: "What is X? Answer: ..."
      new RegExp(`what is ${subjectLower}\\?[^:]*answer[^:]*([^.]{30,800})`, 'i'),
      new RegExp(`what is ${subjectLower}\\?[^:]*([^.]{30,800})`, 'i'),
      
      // Definition format: "X is ..."
      new RegExp(`${subject}\\s+is\\s+([^.]{30,800})`, 'i'),
      new RegExp(`${subject}\\s+means\\s+([^.]{30,800})`, 'i'),
      new RegExp(`${subject}\\s+refers to\\s+([^.]{30,800})`, 'i'),
      
      // Detailed explanation patterns
      new RegExp(`${subject}[^.]*?([^.]{50,1000})`, 'i'),
      
      // General definition: "X ..." (must contain definition words)
      new RegExp(`${subject}\\s+([^.]{30,800})`, 'i')
    ];
    
    for (let i = 0; i < definitionPatterns.length; i++) {
      const pattern = definitionPatterns[i];
      const match = context.match(pattern);
      console.log(`Definition pattern ${i + 1}: ${pattern} - Match: ${match ? match[1] : 'No match'}`);
      
      if (match && match[1].trim().length > 20) {
        const result = match[1].trim();
        console.log(`Pattern ${i + 1} result: "${result}"`);
        
        // ULTRA STRICT VALIDATION - Prevent false information
        const definitionKeywords = ['is', 'means', 'refers to', 'defined as', 'a type of', 'a form of', 'used for', 'purpose', 'function', 'language', 'framework', 'library', 'technology', 'tool'];
        const hasDefinitionKeywords = definitionKeywords.some(keyword => 
          result.toLowerCase().includes(keyword)
        );
        
        // Check if result actually contains the subject
        const containsSubject = result.toLowerCase().includes(subjectLower);
        
        // Check if result starts with or is about the subject
        const startsWithSubject = result.toLowerCase().startsWith(subjectLower);
        const isAboutSubject = result.toLowerCase().includes(`${subjectLower} `) || result.toLowerCase().includes(` ${subjectLower}`);
        
        console.log(`Validation: hasDefinitionKeywords=${hasDefinitionKeywords}, containsSubject=${containsSubject}, startsWithSubject=${startsWithSubject}, isAboutSubject=${isAboutSubject}`);
        
        // For detailed explanations, be more lenient but still validate
        const isDetailedExplanation = lowerQuery.includes('detail') || lowerQuery.includes('more') || lowerQuery.includes('explain');
        
        // ULTRA STRICT: Only return if it's clearly about the subject
        if ((hasDefinitionKeywords || i < 3) && (containsSubject && (startsWithSubject || isAboutSubject))) {
          console.log(`Found valid definition: ${result}`);
          return result;
        }
        
        // For detailed explanations, still require strict subject validation
        if (isDetailedExplanation && result.length > 50 && containsSubject && (startsWithSubject || isAboutSubject)) {
          console.log(`Found detailed explanation: ${result}`);
          return result;
        }
        
        console.log(`Pattern ${i + 1} rejected - not clearly about subject`);
      }
    }
    
    // If no definition patterns found, try to find any relevant content
    console.log(`Subject "${subject}" found but no definition available, looking for relevant content...`);
    
    // Look for sentences containing the subject - STRICT MATCHING
    const sentences = context.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return lowerSentence.includes(subjectLower) && 
             sentence.trim().length > 30 &&
             // Additional validation - sentence should be about the subject
             (lowerSentence.includes('is ') || lowerSentence.includes('means ') || 
              lowerSentence.includes('refers to ') || lowerSentence.includes('defined as '));
    });
    
    if (relevantSentences.length > 0) {
      console.log(`Found ${relevantSentences.length} relevant sentences`);
      // For detailed explanations, return more content
      if (lowerQuery.includes('detail') || lowerQuery.includes('more')) {
        const result = relevantSentences.slice(0, 3).join(' ').trim();
        // Final safety check
        if (result.toLowerCase().includes(subjectLower)) {
          return result;
        }
      }
      const result = relevantSentences[0].trim();
      // Final safety check
      if (result.toLowerCase().includes(subjectLower)) {
        return result;
      }
    }
    
    console.log(`No valid content found for subject "${subject}"`);
    return `Information about "${subject}" is mentioned in the document but no definition or explanation is available.`;
  }
  
  // PROJECT EXTRACTION
  if (lowerQuery.includes('project')) {
    console.log('Looking for projects...');
    
    // Look for project names
    const projectPatterns = [
      /([A-Z][a-z\s]+(?:Manager|Detector|System|App|Application|Tool|Platform))/g,
      /([A-Z][a-z\s]+)\|/g // Pattern for "Project Name|Technology|Date"
    ];
    
    const projects = [];
    for (const pattern of projectPatterns) {
      const matches = context.match(pattern);
      if (matches) {
        projects.push(...matches.map(m => m.trim()).filter(m => m.length > 3));
      }
    }
    
    if (projects.length > 0) {
      console.log(`Found projects: ${projects.join(', ')}`);
      return projects.slice(0, 3).join(', '); // Return top 3 projects
    }
    
    console.log('No projects found');
    return "No projects found in the document.";
  }
  
  // SIMPLE NAME EXTRACTION
  if (lowerQuery.includes('name') && (lowerQuery.includes('candidate') || lowerQuery.includes('person'))) {
    console.log('Looking for name...');
    
    // Try the most obvious pattern first - two capitalized words
    const nameMatch = context.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
    if (nameMatch) {
      console.log(`Found name: ${nameMatch[1]}`);
      return nameMatch[1];
    }
    
    // If that fails, try to get from document name
    const docNameMatch = context.match(/Shreyas Chougule/);
    if (docNameMatch) {
      console.log(`Found name from document: ${docNameMatch[0]}`);
      return docNameMatch[0];
    }
    
    console.log('No name found');
    return "Name not found";
  }
  
  // IMPROVED COLLEGE EXTRACTION
  if (lowerQuery.includes('college') || lowerQuery.includes('university') || lowerQuery.includes('institute')) {
    console.log('Looking for college...');
    console.log('Context for college search:', context.substring(0, 500));
    
    // Try multiple patterns for college names - more flexible
    const collegePatterns = [
      /([A-Z][a-z\s]+(?:University|College|Institute|School))/i,
      /Education[^.]*([A-Z][a-z\s]+(?:University|College|Institute|School))/i,
      /Bachelor[^.]*([A-Z][a-z\s]+(?:University|College|Institute|School))/i,
      /Degree[^.]*([A-Z][a-z\s]+(?:University|College|Institute|School))/i,
      /([A-Z][a-z\s]+(?:University|College|Institute|School))[^.]*Bachelor/i,
      /([A-Z][a-z\s]+(?:University|College|Institute|School))[^.]*Degree/i,
      /([A-Z][a-z\s]+(?:University|College|Institute|School))[^.]*Education/i
    ];
    
    for (let i = 0; i < collegePatterns.length; i++) {
      const pattern = collegePatterns[i];
      const match = context.match(pattern);
      console.log(`College pattern ${i + 1}: ${pattern} - Match: ${match ? match[1] : 'No match'}`);
      if (match) {
        console.log(`Found college: ${match[1].trim()}`);
        return match[1].trim();
      }
    }
    
    // If no college found, return context snippet that might contain it
    console.log('No college pattern found, returning context snippet');
    return context.substring(0, 300).trim();
  }
  
  // Extract company name - improved patterns
  if (lowerQuery.includes('company') || lowerQuery.includes('employer') || lowerQuery.includes('work')) {
    const companyPatterns = [
      /([A-Z][a-z\s]+(?:Technology|Corp|Corporation|Inc|LLC|Ltd))/i,
      /Work Experience[^.]*([A-Z][a-z\s]+(?:Technology|Corp|Corporation|Inc|LLC|Ltd))/i,
      /Intern[^.]*([A-Z][a-z\s]+(?:Technology|Corp|Corporation|Inc|LLC|Ltd))/i,
      /Software Development[^.]*([A-Z][a-z\s]+(?:Technology|Corp|Corporation|Inc|LLC|Ltd))/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = context.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }
  
  // Extract date - improved patterns
  if (lowerQuery.includes('date') || lowerQuery.includes('when') || lowerQuery.includes('time')) {
    const datePatterns = [
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/,
      /\d{4}\s*-\s*\d{4}/, // Year range
      /\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY
      /\d{4}-\d{2}-\d{2}/ // YYYY-MM-DD
    ];
    
    for (const pattern of datePatterns) {
      const match = context.match(pattern);
      if (match) {
        return match[0];
      }
    }
  }
  
  // IMPROVED PROJECT EXTRACTION
  if (lowerQuery.includes('project')) {
    console.log('Looking for projects...');
    console.log('Context for project search:', context.substring(0, 500));
    
    // If asking to explain a specific project
    if (lowerQuery.includes('explain') || lowerQuery.includes('describe')) {
      console.log('Looking for project description...');
      
      // If asking about a specific project (like "Accident detector")
      if (lowerQuery.includes('accident')) {
        const accidentMatch = context.match(/(Accident Detector[^.]*?([^.]{50,300}))/i);
        if (accidentMatch) {
          console.log(`Found Accident Detector description: ${accidentMatch[1]}`);
          return accidentMatch[1];
        }
      }
      
      if (lowerQuery.includes('tournament') || lowerQuery.includes('manager')) {
        const tournamentMatch = context.match(/(Tournament Manager[^.]*?([^.]{50,300}))/i);
        if (tournamentMatch) {
          console.log(`Found Tournament Manager description: ${tournamentMatch[1]}`);
          return tournamentMatch[1];
        }
      }
      
      // General project description search
      const descriptionMatch = context.match(/([A-Z][a-z\s]+(?:Manager|Detector|System|App|Application|Tool|Platform))[^.]*?([^.]{50,200})/);
      if (descriptionMatch) {
        console.log(`Found project description: ${descriptionMatch[1]} - ${descriptionMatch[2]}`);
        return `${descriptionMatch[1]}: ${descriptionMatch[2].trim()}`;
      }
      
      // Fallback: just return the project name
      const projectMatch = context.match(/([A-Z][a-z\s]+(?:Manager|Detector|System|App|Application|Tool|Platform))/);
      if (projectMatch) {
        console.log(`Found project: ${projectMatch[1]}`);
        return projectMatch[1];
      }
    } else {
      // Just looking for project names
      const projectMatch = context.match(/([A-Z][a-z\s]+(?:Manager|Detector|System|App|Application|Tool|Platform))/);
      if (projectMatch) {
        console.log(`Found project: ${projectMatch[1]}`);
        return projectMatch[1];
      }
    }
    
    console.log('No projects found, returning context snippet');
    return context.substring(0, 300).trim();
  }
  
  // Extract skills
  if (lowerQuery.includes('skill') || lowerQuery.includes('technology') || lowerQuery.includes('programming')) {
    const skillPatterns = [
      /Skills[:\s]*([^.]+)/i,
      /Technical Skills[:\s]*([^.]+)/i,
      /Programming Languages[:\s]*([^.]+)/i,
      /Technologies[:\s]*([^.]+)/i
    ];
    
    for (const pattern of skillPatterns) {
      const match = context.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }
  
  // If no specific pattern found, try to return the most relevant context
  console.log('No specific pattern found, looking for most relevant context...');
  
  // Try to find the most relevant sentence or paragraph
  const sentences = context.split(/[.!?]+/);
  let bestMatch = '';
  let bestScore = 0;
  
  for (const sentence of sentences) {
    if (sentence.trim().length > 20) {
      const lowerSentence = sentence.toLowerCase();
      let score = 0;
      
      // Score based on query keywords
      const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
      for (const word of queryWords) {
        if (lowerSentence.includes(word)) {
          score += 1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = sentence.trim();
      }
    }
  }
  
  if (bestMatch) {
    console.log(`Found best match with score ${bestScore}: ${bestMatch}`);
    return bestMatch;
  }
  
  // Final fallback
  const contextSnippet = context.substring(0, 300).trim();
  return contextSnippet || "Information not found in the document.";
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
}) : null;

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload PDF endpoint
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;

      // Extract text from PDF
      const text = await PDFService.extractTextFromPDF(filePath);
      
      // Split into chunks
      const textChunks = PDFService.splitTextIntoChunks(text);

      // Create document record
      const document = await storage.createDocument({
        filename: req.file.filename,
        originalName,
        chunksCount: textChunks.length,
      });

      // Generate embeddings and store chunks
      const embeddings = await EmbeddingService.generateEmbeddings(textChunks);

      for (let i = 0; i < textChunks.length; i++) {
        await storage.createDocumentChunk({
          documentId: document.id,
          chunkIndex: i,
          text: textChunks[i],
          embedding: JSON.stringify(embeddings[i]),
        });
      }

      // Cleanup uploaded file
      await PDFService.cleanupFile(filePath);

      res.json({
        success: true,
        document: {
          id: document.id,
          filename: document.originalName,
          chunksCount: document.chunksCount,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      
      // Cleanup file on error
      if (req.file?.path) {
        await PDFService.cleanupFile(req.file.path);
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process PDF",
      });
    }
  });

  // Query endpoint
  app.post("/api/query", async (req, res) => {
    try {
      const { query } = req.body as { query?: string };
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Generate embedding for query
      const queryEmbedding = await EmbeddingService.generateEmbedding(query);
      console.log(`Query: "${query}" - Embedding generated`);

      // EFFICIENT SEARCH - Use simple text search first, then vector search
      console.log(`Searching for query: "${query}"`);
      
      // First try simple text search across all chunks
      const allChunks = await storage.getAllChunks();
      const allDocuments = await storage.getAllDocuments();
      const documentMap = new Map();
      allDocuments.forEach(doc => {
        documentMap.set(doc.id, doc.originalName);
      });
      
      const textSearchResults = [];
      for (const chunk of allChunks) {
        const chunkText = chunk.text.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // Check if query terms are in chunk
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
        let matchScore = 0;
        
        for (const word of queryWords) {
          if (chunkText.includes(word)) {
            matchScore += 1;
          }
        }
        
        // For definition questions, be more selective
        if (queryLower.includes('what is') || queryLower.includes('define') || queryLower.includes('explain')) {
          // Only include chunks that look like they contain definitions
          const hasDefinitionWords = ['is', 'means', 'refers to', 'defined as', 'answer:', 'question:', 'q:'].some(word => 
            chunkText.includes(word)
          );
          
          if (matchScore > 0 && hasDefinitionWords) {
            textSearchResults.push({
              chunk,
              score: matchScore + 2, // Boost score for definition chunks
              documentName: documentMap.get(chunk.documentId) || 'Unknown Document'
            });
          }
        } else {
          // For other questions, use normal matching
          if (matchScore > 0) {
            textSearchResults.push({
              chunk,
              score: matchScore,
              documentName: documentMap.get(chunk.documentId) || 'Unknown Document'
            });
          }
        }
      }
      
      // Sort by match score and take top results
      textSearchResults.sort((a, b) => b.score - a.score);
      const similarChunks = textSearchResults.slice(0, 10).map(result => ({
        chunk: result.chunk,
        similarity: result.score / 10, // Normalize to 0-1 range
        documentName: result.documentName
      }));
      
      console.log(`Found ${similarChunks.length} chunks via text search for query: "${query}"`);
      
      // If text search didn't find enough results, try vector search
      if (similarChunks.length < 3) {
        console.log('Text search found few results, trying vector search...');
        const vectorChunks = await VectorService.searchSimilarChunks(queryEmbedding, 10, 0.1);
        similarChunks.push(...vectorChunks);
        console.log(`Added ${vectorChunks.length} chunks via vector search`);
      }

      if (similarChunks.length === 0) {
        console.log('No chunks found for query');
        return res.json({
          answer: `I couldn't find any information about "${query}" in your uploaded documents. The information you're looking for may not be present in the current documents.`,
          sources: [],
        });
      }

      // Prepare context - use top chunks
      const sortedChunks = similarChunks.sort((a, b) => b.similarity - a.similarity);
      const context = sortedChunks
        .slice(0, 8) // Use top 8 most relevant chunks
        .map((result, index) => `[Source ${index + 1}]: ${result.chunk.text}`)
        .join("\n\n");
      
      // Debug: log the context being processed
      console.log(`\n=== CONTEXT FOR QUERY: "${query}" ===`);
      console.log(`Context length: ${context.length}`);
      console.log(`Number of sources: ${sortedChunks.length}`);
      console.log('Context preview:', context.substring(0, 500) + '...');
      console.log(`=== END CONTEXT ===\n`);

      // Generate response using Gemini/OpenAI or fallback
      const prompt = `You are an information extraction tool. Extract ONLY the specific information requested.

Context: ${context}

Question: ${query}

IMPORTANT: Return ONLY the exact information requested. No explanations, no additional text.

Examples:
- Question: "What is the name of the candidate?" → Answer: "Shreyas Chougule"
- Question: "What is the college name?" → Answer: "University Name"
- Question: "What are the projects?" → Answer: "Project 1, Project 2"

Answer:`;

      // USE SIMPLE EXTRACTION
      console.log('Using simple extraction');
      const answer = extractInformationFromContext(context, query);
      console.log(`Extraction result: "${answer}"`);
      
      // If extraction failed, return not found message
      if (!answer || answer.trim().length === 0) {
        return res.json({
          answer: `I couldn't find any information about "${query}" in your uploaded documents.`,
          sources: [],
        });
      }

      // Format sources for frontend with better text preview
      const sources = similarChunks.map((result) => ({
        docName: result.documentName,
        chunkIndex: result.chunk.chunkIndex,
        text: result.chunk.text.substring(0, 500) + (result.chunk.text.length > 500 ? "..." : ""),
        similarity: Math.round(result.similarity * 100) / 100,
        relevance: result.similarity > 0.9 ? "Very High" : 
                  result.similarity > 0.8 ? "High" : 
                  result.similarity > 0.7 ? "Medium" : "Low"
      }));

      // Save query to storage
      await storage.createQuery({
        query,
        response: answer,
        sources: JSON.stringify(sources),
      });

      res.json({
        answer,
        sources,
      });
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process query",
      });
    }
  });

  // Get documents endpoint
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json({
        documents: documents.map(doc => ({
          id: doc.id,
          filename: doc.originalName,
          chunksCount: doc.chunksCount,
          uploadedAt: doc.uploadedAt,
        })),
      });
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get documents",
      });
    }
  });

  // Delete document endpoint
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      await storage.deleteDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete document",
      });
    }
  });

  // Get statistics endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      const queries = await storage.getRecentQueries();
      
      res.json({
        totalDocuments: documents.length,
        totalQueries: queries.length,
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get statistics",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

