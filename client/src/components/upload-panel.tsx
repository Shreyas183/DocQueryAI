import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

interface UploadPanelProps {
  documents: Document[];
  stats: Stats;
  onUploadSuccess: () => void;
  onDocumentDelete: () => void;
  isLoading: boolean;
}

export default function UploadPanel({ documents, stats, onUploadSuccess, onDocumentDelete, isLoading }: UploadPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: `${data.document.filename} has been processed with ${data.document.chunksCount} chunks.`,
      });
      onUploadSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await apiRequest("DELETE", `/api/documents/${documentId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "Document has been removed successfully.",
      });
      onDocumentDelete();
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === "application/pdf");
    if (files.length > 0) {
      handleFileUpload(files);
    } else {
      toast({
        title: "Invalid files",
        description: "Please upload only PDF files.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    setSelectedFiles(files);
    
    for (const file of files) {
      await uploadMutation.mutateAsync(file);
    }
    
    setSelectedFiles([]);
  };

  const handleDelete = (documentId: string) => {
    deleteMutation.mutate(documentId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="lg:col-span-1">
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <i className="fas fa-upload text-primary mr-2"></i>
          Upload Documents
        </h2>
        
        {/* Upload Zone */}
        <div 
          className={`upload-zone border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer ${isDragOver ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
          data-testid="upload-zone"
        >
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <i className="fas fa-file-pdf text-2xl text-muted-foreground"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Drop PDF documents here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </div>
            <button 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              data-testid="button-select-files"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Processing..." : "Select Files"}
            </button>
          </div>
          <input 
            id="file-input"
            type="file" 
            className="hidden" 
            accept=".pdf" 
            multiple
            onChange={handleFileSelect}
            data-testid="input-file"
          />
        </div>
        
        {/* Upload Progress */}
        {uploadMutation.isPending && selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-foreground" data-testid={`text-filename-${index}`}>{file.name}</span>
                <span className="text-muted-foreground">Processing...</span>
              </div>
            ))}
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full w-3/4 transition-all duration-300"></div>
            </div>
          </div>
        )}
        
        {/* Uploaded Documents */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-foreground mb-3">Recent Documents</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-muted-foreground rounded"></div>
                      <div className="space-y-1">
                        <div className="h-3 bg-muted-foreground rounded w-32"></div>
                        <div className="h-2 bg-muted-foreground rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Upload your first document to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid={`card-document-${doc.id}`}>
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-file-pdf text-destructive"></i>
                    <div>
                      <p className="text-sm font-medium text-foreground" data-testid={`text-document-name-${doc.id}`}>
                        {doc.filename}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-chunks-count-${doc.id}`}>
                        {doc.chunksCount} chunks processed • {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <button 
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${doc.id}`}
                  >
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Statistics Card */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6 mt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary" data-testid="text-total-documents">
              {stats.totalDocuments}
            </div>
            <div className="text-xs text-muted-foreground">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary" data-testid="text-total-queries">
              {stats.totalQueries}
            </div>
            <div className="text-xs text-muted-foreground">Queries</div>
          </div>
        </div>
      </div>
    </div>
  );
}
