import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Source {
  docName: string;
  chunkIndex: number;
  text: string;
  similarity: number;
  relevance?: string;
}

interface QueryResponse {
  answer: string;
  sources: Source[];
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface QueryPanelProps {
  onSourceClick: (source: Source) => void;
}

const SUGGESTED_QUESTIONS = [
  "What is the main topic of this document?",
  "Can you summarize the key findings?", 
  "What are the important conclusions?",
  "What methodology was used?",
  "What are the main recommendations?",
];

export default function QueryPanel({ onSourceClick }: QueryPanelProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: "Hello! I'm your AI document assistant. Upload any PDF documents and ask me questions about their contents. I can help you find specific information, summarize sections, or answer questions based on what's in your documents.",
    }
  ]);
  const { toast } = useToast();

  const queryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryText }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Query failed");
      }

      return res.json() as Promise<QueryResponse>;
    },
    onSuccess: (data, queryText) => {
      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: queryText,
      };

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: data.answer,
        sources: data.sources,
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Query failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || queryMutation.isPending) return;
    
    queryMutation.mutate(query.trim());
  };

  const handleSuggestedQuestion = (question: string) => {
    setQuery(question);
  };

  const clearInput = () => {
    setQuery("");
  };

  const getSourceColor = (index: number) => {
    const colors = ['primary', 'secondary', 'accent'];
    return colors[index % colors.length];
  };

  return (
    <div className="lg:col-span-2">
      <div className="bg-card rounded-lg border border-border shadow-sm h-full flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            <i className="fas fa-comments text-primary mr-2"></i>
            AI Document Assistant
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Ask questions about your uploaded documents</p>
        </div>
        
        {/* Chat Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto max-h-96">
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="chat-message">
                {message.type === 'assistant' ? (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-primary-foreground text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-sm text-foreground leading-relaxed" data-testid={`text-message-${message.id}`}>
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Source Attribution */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, index) => {
                              const colorClass = getSourceColor(index);
                              return (
                                <div
                                  key={index}
                                  className={`source-tag inline-flex items-center bg-${colorClass}/10 text-${colorClass} px-3 py-1 rounded-full text-xs cursor-pointer`}
                                  onClick={() => onSourceClick(source)}
                                  data-testid={`button-source-${message.id}-${index}`}
                                  title={`Relevance: ${source.relevance || 'Unknown'} (${Math.round(source.similarity * 100)}%)`}
                                >
                                  <i className="fas fa-file-pdf mr-1"></i>
                                  <span>{source.docName} - chunk {source.chunkIndex}</span>
                                  {source.relevance && (
                                    <span className="ml-1 text-xs opacity-75">({source.relevance})</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3 justify-end">
                    <div className="bg-primary rounded-lg p-4 max-w-md">
                      <p className="text-sm text-primary-foreground" data-testid={`text-message-${message.id}`}>
                        {message.content}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-user text-accent-foreground text-sm"></i>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {queryMutation.isPending && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-robot text-primary-foreground text-sm"></i>
                </div>
                <div className="bg-muted rounded-lg p-4 max-w-md">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                    <p className="text-sm text-foreground">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Query Input */}
        <div className="p-6 border-t border-border">
          <form onSubmit={handleSubmit} className="flex space-x-3" data-testid="form-query">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Ask a question about your documents..."
                className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={queryMutation.isPending}
                data-testid="input-query"
              />
              {query && (
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={clearInput}
                  data-testid="button-clear-input"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              )}
            </div>
            <button 
              type="submit" 
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!query.trim() || queryMutation.isPending}
              data-testid="button-send-query"
            >
              <i className="fas fa-paper-plane"></i>
              <span>{queryMutation.isPending ? "Sending..." : "Send"}</span>
            </button>
          </form>
          
          {/* Quick Suggestions */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  className="bg-muted text-muted-foreground hover:text-foreground px-3 py-1 rounded-full text-xs transition-colors"
                  onClick={() => handleSuggestedQuestion(suggestion)}
                  disabled={queryMutation.isPending}
                  data-testid={`button-suggestion-${index}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
