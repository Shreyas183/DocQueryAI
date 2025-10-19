import fs from 'fs';
import path from 'path';

export class PDFService {
  static async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      // Dynamic import to avoid initialization issues with pdf-parse
      // @ts-ignore - pdf-parse doesn't have proper types
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static splitTextIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    
    // Clean up the text first
    const cleanedText = text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim();

    // For educational documents, try to preserve question-answer pairs
    if (this.isEducationalDocument(cleanedText)) {
      return this.splitEducationalContent(cleanedText, chunkSize, overlap);
    }

    // Split by sections first (look for common resume sections)
    const sections = this.splitIntoSections(cleanedText);
    
    for (const section of sections) {
      if (section.length <= chunkSize) {
        // If section is small enough, keep it as one chunk
        chunks.push(section.trim());
      } else {
        // Split large sections into smaller chunks
        const sectionChunks = this.splitSectionIntoChunks(section, chunkSize, overlap);
        chunks.push(...sectionChunks);
      }
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  private static isEducationalDocument(text: string): boolean {
    // Check if this looks like an educational/interview guide document
    const educationalKeywords = ['Q:', 'Question:', 'Answer:', 'Interview', 'Guide', 'Preparation', 'JavaScript', 'React', 'Node'];
    return educationalKeywords.some(keyword => text.includes(keyword));
  }

  private static splitEducationalContent(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    
    // Try multiple Q&A patterns
    const qaPatterns = [
      /(Q\d+:|Question\s*\d*:|Q\s*\d*:)/gi,
      /(What is|What are|Define|Explain)\s+[^?]+\?/gi
    ];
    
    for (const pattern of qaPatterns) {
      const sections = text.split(pattern);
      
      for (let i = 0; i < sections.length; i += 2) {
        if (i + 1 < sections.length) {
          const question = sections[i]?.trim();
          const answer = sections[i + 1]?.trim();
          
          if (question && answer) {
            const qaPair = `${question}\n${answer}`;
            if (qaPair.length <= chunkSize) {
              chunks.push(qaPair);
            } else {
              // Split long Q&A pairs
              const qaChunks = this.splitSectionIntoChunks(qaPair, chunkSize, overlap);
              chunks.push(...qaChunks);
            }
          }
        }
      }
      
      // If we found chunks with this pattern, use them
      if (chunks.length > 0) {
        break;
      }
    }
    
    // If no Q&A structure found, fall back to regular chunking
    if (chunks.length === 0) {
      return this.splitSectionIntoChunks(text, chunkSize, overlap);
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  private static splitIntoSections(text: string): string[] {
    // Common resume section headers
    const sectionHeaders = [
      'Education', 'Experience', 'Work Experience', 'Professional Experience',
      'Skills', 'Technical Skills', 'Projects', 'Personal Projects',
      'Contact', 'Contact Information', 'About', 'Summary', 'Objective',
      'Certifications', 'Languages', 'Interests', 'Hobbies'
    ];
    
    const sections: string[] = [];
    let currentSection = '';
    let lastIndex = 0;
    
    // Look for section headers
    for (const header of sectionHeaders) {
      const headerRegex = new RegExp(`\\b${header}\\b`, 'gi');
      const match = text.match(headerRegex);
      
      if (match) {
        const headerIndex = text.indexOf(match[0], lastIndex);
        if (headerIndex > lastIndex) {
          // Add previous section
          if (currentSection.trim()) {
            sections.push(currentSection.trim());
          }
          currentSection = text.slice(lastIndex, headerIndex);
          lastIndex = headerIndex;
        }
      }
    }
    
    // Add the last section
    if (lastIndex < text.length) {
      currentSection += text.slice(lastIndex);
    }
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }
    
    // If no sections found, split by paragraphs
    if (sections.length === 1) {
      return text.split(/\n\s*\n/).filter(section => section.trim().length > 0);
    }
    
    return sections;
  }

  private static splitSectionIntoChunks(section: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < section.length) {
      const end = Math.min(start + chunkSize, section.length);
      let chunk = section.slice(start, end);

      // Try to break at sentence boundaries
      if (end < section.length) {
        const lastPeriod = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const lastComma = chunk.lastIndexOf(',');
        const breakPoint = Math.max(lastPeriod, lastNewline, lastComma);
        
        if (breakPoint > start + chunkSize * 0.6) {
          chunk = section.slice(start, breakPoint + 1);
          start = breakPoint + 1 - overlap;
        } else {
          start = end - overlap;
        }
      } else {
        start = end;
      }

      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  static async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup file:', error);
    }
  }
}
