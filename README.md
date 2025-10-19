# DocQueryAI

DocQueryAI is a sophisticated full-stack RAG (Retrieval-Augmented Generation) application built with TypeScript. It allows users to upload PDF documents, generate embeddings, and ask intelligent questions about their content. The system uses advanced text processing, vector search, and AI-powered extraction to provide accurate, source-attributed answers.

---

## 🚀 Features

### Core Functionality
- **PDF Document Processing**: Upload and process PDF files up to 10MB
- **Intelligent Text Extraction**: Advanced PDF text extraction with structure preservation
- **Smart Chunking**: Sentence-aware chunking that preserves document structure and Q&A pairs
- **Vector Search**: Efficient similarity search using cosine similarity with configurable thresholds
- **AI-Powered Answers**: Multiple AI providers with intelligent fallback systems
- **Source Attribution**: Clickable source references with relevance indicators
- **Real-time Statistics**: Track documents and queries with live updates

### Advanced Capabilities
- **Definition Extraction**: Precise extraction of definitions and explanations
- **Project Recognition**: Automatic detection and extraction of project information
- **Typo Handling**: Smart normalization of common technical terms
- **Context Awareness**: Understanding of pronouns and follow-up questions
- **Misinformation Prevention**: Ultra-strict validation to prevent false information
- **Educational Document Support**: Optimized for interview guides and technical documentation

---

## 🛠️ Tech Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **Vite**: Lightning-fast build tool and development server
- **TypeScript**: Full type safety across the application
- **TailwindCSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Accessible, unstyled UI components
- **TanStack Query**: Powerful data fetching and caching library
- **React Hook Form**: Efficient form handling and validation

### Backend
- **Node.js**: JavaScript runtime for server-side development
- **Express.js**: Fast, unopinionated web framework
- **TypeScript**: Type-safe server-side development
- **pdf-parse**: PDF text extraction library
- **CORS**: Cross-origin resource sharing support

### AI & Machine Learning
- **Google Gemini API**: Primary AI provider (gemini-2.5-flash model)
- **OpenAI API**: Secondary AI provider (gpt-4o-mini model)
- **Custom Embedding Service**: Deterministic fallback embeddings when APIs unavailable
- **Vector Search**: Cosine similarity-based chunk retrieval

### Development & Build Tools
- **Vite**: Frontend build tool and dev server
- **esbuild**: Fast JavaScript bundler
- **tsx**: TypeScript execution for development
- **cross-env**: Cross-platform environment variable handling
- **Drizzle ORM**: Optional database schema management (PostgreSQL)

---

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Services   │
│   (React/Vite)  │◄──►│   (Express.js)  │◄──►│   (Gemini/OpenAI)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Storage       │
                    │   (In-Memory)   │
                    └─────────────────┘
```

### Data Flow
1. **Upload**: PDF → Text Extraction → Chunking → Embedding Generation → Storage
2. **Query**: User Question → Embedding → Vector Search → Context Retrieval → AI Processing → Answer
3. **Response**: Answer + Sources → Frontend Display → User Interaction

---

## 📁 Project Structure

```
DocQueryAI/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── upload-panel.tsx
│   │   │   ├── query-panel.tsx
│   │   │   ├── document-preview-modal.tsx
│   │   │   └── statistics-card.tsx
│   │   ├── pages/
│   │   │   └── home.tsx        # Main application page
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Utility functions
│   └── index.html
├── server/                     # Express backend server
│   ├── services/               # Core business logic
│   │   ├── pdfService.ts       # PDF processing and chunking
│   │   ├── embeddingService.ts # Embedding generation
│   │   └── vectorService.ts    # Vector search operations
│   ├── storage.ts              # In-memory data storage
│   ├── routes.ts               # API route handlers
│   └── index.ts                # Server entry point
├── shared/                     # Shared types and schemas
├── uploads/                    # Temporary PDF storage (gitignored)
├── dist/                       # Production build output
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite configuration
└── README.md                   # This file
```

---

## 🔧 How It Works

### 1. Document Processing Pipeline

#### PDF Upload & Validation
- **File Validation**: Checks file type, size (max 10MB), and format
- **Temporary Storage**: Stores PDF in `uploads/` directory
- **Error Handling**: Comprehensive error messages for invalid files

#### Text Extraction
- **PDF Parsing**: Uses `pdf-parse` library for text extraction
- **Content Cleaning**: Removes extra whitespace and normalizes text
- **Structure Preservation**: Maintains document formatting and structure

#### Intelligent Chunking
- **Educational Document Detection**: Automatically detects interview guides and tutorials
- **Q&A Pair Preservation**: Keeps question-answer pairs together in chunks
- **Section-Aware Splitting**: Splits by document sections (Education, Experience, etc.)
- **Sentence-Aware Boundaries**: Breaks at sentence boundaries for better context
- **Overlapping Chunks**: 200-character overlap for context continuity
- **Chunk Size**: 1000 characters for optimal balance of context and precision

### 2. Embedding Generation

#### Primary Methods
- **Google Gemini API**: High-quality semantic embeddings when `GEMINI_API_KEY` is set
- **OpenAI API**: Alternative embeddings when `OPENAI_API_KEY` is set

#### Fallback System
- **Deterministic Embeddings**: Custom algorithm when APIs unavailable
- **Word-Based Features**: Uses word hashes for better semantic understanding
- **Character-Level Features**: Additional character-based features
- **Normalization**: L2 normalization for consistent vector lengths

### 3. Query Processing

#### Search Algorithm
- **Text Search First**: Fast keyword matching across all chunks
- **Vector Search Fallback**: Semantic search when text search finds few results
- **Hybrid Approach**: Combines both methods for optimal results
- **Scoring System**: Ranks chunks by relevance and match quality

#### Context Selection
- **Top-K Retrieval**: Selects top 8 most relevant chunks
- **Similarity Thresholding**: Configurable thresholds for result quality
- **Definition-Focused Search**: Special handling for definition questions
- **Relevance Boosting**: Higher scores for definition-containing chunks

### 4. Answer Generation

#### AI Processing
- **Gemini (Primary)**: Uses gemini-2.5-flash for high-quality responses
- **OpenAI (Secondary)**: Falls back to gpt-4o-mini if Gemini unavailable
- **Direct Extraction (Fallback)**: Pattern-based extraction when no AI available

#### Extraction System
- **Definition Patterns**: Multiple regex patterns for different definition formats
- **Q&A Format Support**: Handles "What is X? Answer:" patterns
- **Project Recognition**: Extracts project names and descriptions
- **Typo Handling**: Normalizes common technical terms
- **Context Awareness**: Resolves pronouns like "explain it more"

#### Validation & Safety
- **Ultra-Strict Validation**: Prevents false information
- **Subject Verification**: Ensures answers are about the actual subject
- **Definition Keywords**: Validates content contains definition words
- **Misinformation Prevention**: Multiple layers of validation

### 5. Response Formatting

#### Answer Structure
- **Direct Answers**: Concise, specific responses to questions
- **Source Attribution**: Links to specific document chunks
- **Relevance Indicators**: Shows confidence levels (High, Medium, Low)
- **Error Handling**: Clear "not found" messages when information unavailable

#### Source Management
- **Chunk References**: Links to specific document sections
- **Preview Functionality**: Clickable sources show full chunk content
- **Document Tracking**: Maintains document metadata and timestamps
- **Similarity Scores**: Shows how relevant each source is

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**: Required for running the application
- **npm**: Package manager for dependencies
- **Operating System**: Windows, macOS, or Linux

### Optional API Keys
- **Gemini API Key**: For high-quality AI responses
- **OpenAI API Key**: Alternative AI provider
- **Note**: App works without API keys using fallback systems

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd DocQueryAI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional):
   ```bash
   # Create .env file in project root
   GEMINI_API_KEY=your_gemini_key_here
   OPENAI_API_KEY=your_openai_key_here
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   - Navigate to `http://localhost:5000` (or the port shown in console)
   - The app will automatically reload when you make changes

### Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

3. **Environment configuration**:
   ```bash
   PORT=5000                    # Server port (default: 5000)
   GEMINI_API_KEY=your_key     # Optional: Gemini API key
   OPENAI_API_KEY=your_key     # Optional: OpenAI API key
   ```

---

## 📚 API Documentation

### Base URL
All API endpoints are served from the same host and port as the frontend.

### Endpoints

#### Upload Document
```http
POST /api/upload
Content-Type: multipart/form-data

Body: file (PDF, max 10MB)
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc_123",
    "filename": "document.pdf",
    "chunksCount": 15,
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Query Documents
```http
POST /api/query
Content-Type: application/json

Body: {
  "query": "What is JavaScript?"
}
```

**Response:**
```json
{
  "answer": "JavaScript is a high-level, interpreted programming language...",
  "sources": [
    {
      "docName": "document.pdf",
      "chunkIndex": 3,
      "text": "JavaScript is a programming language...",
      "similarity": 0.89,
      "relevance": "High"
    }
  ]
}
```

#### Get Documents
```http
GET /api/documents
```

**Response:**
```json
[
  {
    "id": "doc_123",
    "originalName": "document.pdf",
    "chunksCount": 15,
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
]
```

#### Delete Document
```http
DELETE /api/documents/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### Get Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "totalDocuments": 5,
  "totalQueries": 23
}
```

---

## 🎯 Usage Guide

### Uploading Documents
1. **Drag and Drop**: Drag PDF files onto the upload area
2. **File Selection**: Click to browse and select PDF files
3. **Processing**: Wait for text extraction and chunking to complete
4. **Verification**: Check the document appears in the Recent Documents list

### Asking Questions
1. **Type Your Question**: Enter questions in the chat input
2. **Supported Formats**:
   - "What is [topic]?" - Definition questions
   - "Explain [topic]" - Detailed explanations
   - "Name any project" - Project extraction
   - "What is the name of the candidate?" - Personal information
3. **View Sources**: Click on source tags to see full context
4. **Follow-up Questions**: Ask "explain it more" for additional details

### Understanding Responses
- **Answer Quality**: Check relevance indicators (High, Medium, Low)
- **Source Verification**: Click sources to verify information
- **Not Found Messages**: Clear indication when information isn't available
- **Error Handling**: Helpful messages for invalid requests

---

## 🔍 Advanced Features

### Smart Chunking
- **Educational Documents**: Preserves Q&A structure in interview guides
- **Resume Processing**: Maintains section boundaries (Education, Experience, etc.)
- **Overlapping Context**: Ensures no information is lost between chunks
- **Size Optimization**: Balances context richness with search precision

### Intelligent Search
- **Multi-Modal Search**: Combines text and vector search
- **Context-Aware**: Understands follow-up questions and pronouns
- **Typo Tolerance**: Handles common misspellings and variations
- **Definition Focus**: Specialized patterns for definition questions

### AI Integration
- **Multiple Providers**: Gemini and OpenAI support
- **Intelligent Fallback**: Seamless degradation when APIs unavailable
- **Cost Optimization**: Efficient token usage and caching
- **Quality Assurance**: Validation to prevent misinformation

---

## 🛡️ Security & Privacy

### Data Handling
- **Temporary Storage**: PDFs are processed and removed from disk
- **In-Memory Storage**: No persistent database storage
- **API Key Security**: Keys stored as server-side environment variables
- **No User Tracking**: No personal data collection or storage

### Best Practices
- **Input Validation**: Comprehensive validation of all inputs
- **Error Handling**: Secure error messages without sensitive information
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **File Size Limits**: Prevents abuse with 10MB file size limit

---

## 🐛 Troubleshooting

### Common Issues

#### Development Issues
- **Module Build Errors**: Delete `node_modules` and `package-lock.json`, then `npm install`
- **Port Conflicts**: Set `PORT=5050` environment variable
- **TypeScript Errors**: Run `npm run check` to identify type issues

#### Runtime Issues
- **PDF Upload Fails**: Ensure file is PDF format and under 10MB
- **No AI Responses**: Check API keys are correctly set in environment
- **Poor Search Results**: Try rephrasing questions or uploading more relevant documents

#### Performance Issues
- **Slow Responses**: Check API key limits and network connectivity
- **Memory Usage**: Restart server if memory usage becomes high
- **Large Documents**: Consider splitting very large PDFs into smaller files

### Debug Mode
- **Console Logging**: Check server console for detailed debug information
- **Pattern Matching**: View which extraction patterns are being used
- **Validation Results**: See why certain content is accepted or rejected

---

## 📈 Performance & Scalability

### Current Limitations
- **In-Memory Storage**: Data lost on server restart
- **Single Instance**: No horizontal scaling support
- **File Size**: 10MB limit per PDF file
- **Concurrent Users**: Limited by single server instance

### Optimization Features
- **Efficient Chunking**: Optimized chunk sizes for better performance
- **Smart Caching**: TanStack Query for frontend data caching
- **Vector Search**: Fast similarity search with configurable thresholds
- **Lazy Loading**: Components load only when needed

### Future Improvements
- **Database Integration**: PostgreSQL support via Drizzle ORM
- **Horizontal Scaling**: Multi-instance support with shared storage
- **Advanced Caching**: Redis integration for better performance
- **Batch Processing**: Support for multiple file uploads

---

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards
- **TypeScript**: Use strict type checking
- **ESLint**: Follow configured linting rules
- **Prettier**: Use consistent code formatting
- **Comments**: Document complex logic and algorithms

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini**: For providing the primary AI service
- **OpenAI**: For alternative AI capabilities
- **pdf-parse**: For reliable PDF text extraction
- **Radix UI**: For accessible UI components
- **TanStack Query**: For powerful data fetching
- **Vite**: For fast development experience
- **TailwindCSS**: For utility-first styling

---

## 📞 Support

For questions, issues, or contributions:
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check this README and inline code comments

---

*Built with ❤️ using modern web technologies and AI capabilities.*