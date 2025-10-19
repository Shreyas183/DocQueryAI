import { type Document, type InsertDocument, type DocumentChunk, type InsertDocumentChunk, type Query, type InsertQuery } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Document methods
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: string): Promise<void>;

  // Document chunk methods
  createDocumentChunk(chunk: InsertDocumentChunk): Promise<DocumentChunk>;
  getDocumentChunks(documentId: string): Promise<DocumentChunk[]>;
  getAllChunks(): Promise<DocumentChunk[]>;
  deleteDocumentChunks(documentId: string): Promise<void>;

  // Query methods
  createQuery(query: InsertQuery): Promise<Query>;
  getRecentQueries(): Promise<Query[]>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, Document>;
  private documentChunks: Map<string, DocumentChunk>;
  private queries: Map<string, Query>;

  constructor() {
    this.documents = new Map();
    this.documentChunks = new Map();
    this.queries = new Map();
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      id,
      ...insertDocument,
      chunksCount: insertDocument.chunksCount || 0,
      uploadedAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    await this.deleteDocumentChunks(id);
  }

  async createDocumentChunk(insertChunk: InsertDocumentChunk): Promise<DocumentChunk> {
    const id = randomUUID();
    const chunk: DocumentChunk = {
      id,
      ...insertChunk,
      embedding: insertChunk.embedding || null,
    };
    this.documentChunks.set(id, chunk);
    return chunk;
  }

  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    return Array.from(this.documentChunks.values())
      .filter(chunk => chunk.documentId === documentId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async getAllChunks(): Promise<DocumentChunk[]> {
    return Array.from(this.documentChunks.values());
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    for (const [id, chunk] of Array.from(this.documentChunks.entries())) {
      if (chunk.documentId === documentId) {
        this.documentChunks.delete(id);
      }
    }
  }

  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const id = randomUUID();
    const query: Query = {
      id,
      ...insertQuery,
      sources: insertQuery.sources || null,
      createdAt: new Date(),
    };
    this.queries.set(id, query);
    return query;
  }

  async getRecentQueries(): Promise<Query[]> {
    return Array.from(this.queries.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);
  }
}

export const storage = new MemStorage();
