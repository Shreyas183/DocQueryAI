interface Source {
  docName: string;
  chunkIndex: number;
  text: string;
  similarity: number;
  relevance?: string;
}

interface DocumentPreviewModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentPreviewModal({ source, isOpen, onClose }: DocumentPreviewModalProps) {
  if (!isOpen || !source) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" 
      onClick={handleBackdropClick}
      data-testid="modal-document-preview"
    >
      <div className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Document Preview</h3>
          <button 
            className="text-muted-foreground hover:text-foreground" 
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <i className="fas fa-file-pdf text-destructive"></i>
            <div>
              <p className="text-sm font-medium text-foreground" data-testid="text-document-name">
                {source.docName}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-chunk-info">
                Chunk {source.chunkIndex} • Relevance: {source.relevance || 'Unknown'} ({Math.round(source.similarity * 100)}%)
              </p>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-foreground leading-relaxed" data-testid="text-chunk-content">
              {source.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
