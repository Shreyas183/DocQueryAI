import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "";
const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
}) : null;

export class EmbeddingService {
  static async generateEmbedding(text: string): Promise<number[]> {
    // Fallback: improved deterministic embedding if no OpenAI API key
    if (!openai) {
      const dimension = 256;
      const vector = new Array<number>(dimension).fill(0);
      const limited = text.toLowerCase().substring(0, 5000);
      
      // Create word-based features for better semantic understanding
      const words = limited.split(/\s+/).filter(word => word.length > 2);
      const wordHashes = new Set<string>();
      
      for (const word of words) {
        // Create hash for word
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
        }
        wordHashes.add(Math.abs(hash).toString());
      }
      
      // Use word hashes and character features
      let featureIndex = 0;
      for (const wordHash of wordHashes) {
        const idx = parseInt(wordHash) % dimension;
        vector[idx] += 1.0;
        featureIndex++;
      }
      
      // Add character-level features
      for (let i = 0; i < limited.length; i++) {
        const code = limited.charCodeAt(i);
        const idx = (code + i) % dimension;
        vector[idx] += ((code % 31) + 1) / 32;
      }
      
      // normalize
      const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
      return vector.map((v) => v / norm);
    }

    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000),
      });

      return response.data[0].embedding as unknown as number[];
    } catch (error) {
      // If OpenAI fails at runtime, degrade to improved fallback
      const dimension = 256;
      const vector = new Array<number>(dimension).fill(0);
      const limited = text.toLowerCase().substring(0, 5000);
      
      // Create word-based features for better semantic understanding
      const words = limited.split(/\s+/).filter(word => word.length > 2);
      const wordHashes = new Set<string>();
      
      for (const word of words) {
        // Create hash for word
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
        }
        wordHashes.add(Math.abs(hash).toString());
      }
      
      // Use word hashes and character features
      for (const wordHash of wordHashes) {
        const idx = parseInt(wordHash) % dimension;
        vector[idx] += 1.0;
      }
      
      // Add character-level features
      for (let i = 0; i < limited.length; i++) {
        const code = limited.charCodeAt(i);
        const idx = (code + i) % dimension;
        vector[idx] += ((code % 31) + 1) / 32;
      }
      
      const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
      return vector.map((v) => v / norm);
    }
  }

  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches to avoid rate limits
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return embeddings;
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
