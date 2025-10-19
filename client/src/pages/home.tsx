import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import UploadPanel from "@/components/upload-panel";
import QueryPanel from "@/components/query-panel";
import DocumentPreviewModal from "@/components/document-preview-modal";

interface Document {
  id: string;
  filename: string;
  chunksCount: number;
  uploadedAt: string;
}

interface Stats {
  totalDocuments: number;
  totalQueries: number;
}

interface Source {
  docName: string;
  chunkIndex: number;
  text: string;
  similarity: number;
}

export default function Home() {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: documentsData, isLoading: documentsLoading } = useQuery<{ documents: Document[] }>({
    queryKey: ["/api/documents", refreshKey],
  });

  const { data: statsData } = useQuery<Stats>({
    queryKey: ["/api/stats", refreshKey],
  });

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDocumentDelete = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSourceClick = (source: Source) => {
    setSelectedSource(source);
  };

  const handleCloseModal = () => {
    setSelectedSource(null);
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-file-alt text-primary-foreground text-sm"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">DocQuery</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Document Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <i className="fas fa-cog"></i>
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <i className="fas fa-user-circle text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <UploadPanel 
            documents={documentsData?.documents || []}
            stats={statsData || { totalDocuments: 0, totalQueries: 0 }}
            onUploadSuccess={handleUploadSuccess}
            onDocumentDelete={handleDocumentDelete}
            isLoading={documentsLoading}
          />
          
          <QueryPanel onSourceClick={handleSourceClick} />
        </div>
      </div>

      <DocumentPreviewModal
        source={selectedSource}
        isOpen={!!selectedSource}
        onClose={handleCloseModal}
      />
    </div>
  );
}
