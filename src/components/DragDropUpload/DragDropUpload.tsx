import React, { useState, useRef, useCallback, useEffect } from 'react';
import './DragDropUpload.css';

export interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  preview?: string;
  errorMessage?: string;
}

interface DragDropUploadProps {
  maxFiles?: number;
  maxFileSize?: number; 
  acceptedFormats?: string[];
  onFilesSelected: (files: UploadFile[]) => void;
  onFileRemove?: (fileId: string) => void;
  existingFiles?: UploadFile[];
  disabled?: boolean;
  label?: string;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, 
  acceptedFormats = ['image/jpeg', 'image/png', 'image/jpg'],
  onFilesSelected,
  onFileRemove,
  existingFiles = [],
  disabled = false,
  label = 'Перетащите изображения сюда или нажмите для выбора'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>(existingFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    setFiles(existingFiles);
  }, [existingFiles]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!acceptedFormats.includes(file.type)) {
      return { valid: false, error: `Неподдерживаемый формат. Разрешены: JPG, PNG` };
    }
    if (file.size > maxFileSize) {
      return { valid: false, error: `Файл слишком большой (макс. ${maxFileSize / 1024 / 1024} МБ)` };
    }
    return { valid: true };
  };

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const processFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || disabled) return;

    const newFiles: UploadFile[] = [];
    const validFiles: File[] = [];

    const remainingSlots = maxFiles - files.length;
    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const validation = validateFile(file);
      
      if (validation.valid) {
        const preview = await createPreview(file);
        const uploadFile: UploadFile = {
          file,
          id: generateId(),
          progress: 0,
          status: 'pending',
          preview
        };
        newFiles.push(uploadFile);
        validFiles.push(file);
      } else {
        const uploadFile: UploadFile = {
          file,
          id: generateId(),
          progress: 0,
          status: 'error',
          preview: '',
          errorMessage: validation.error
        };
        newFiles.push(uploadFile);
      }
    }

    if (newFiles.length > 0) {
      const pendingFiles = newFiles.filter(f => f.status === 'pending');
      setFiles(prev => [...prev, ...newFiles]);
      if (pendingFiles.length > 0) {
        onFilesSelected(pendingFiles);

        simulateProgress(pendingFiles.map(f => f.id));
      }
    }
  }, [files.length, maxFiles, disabled, onFilesSelected]);

  const simulateProgress = (fileIds: string[]) => {
    fileIds.forEach((fileId, index) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress, status: 'completed' } : f
          ));
        } else {
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress, status: 'uploading' } : f
          ));
        }
      }, 100 + index * 50);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (onFileRemove) {
      onFileRemove(fileId);
    }
  };

  const acceptedExtensions = acceptedFormats
    .map(type => type.split('/')[1])
    .join(', ');

  return (
    <div className="drag-drop-upload">
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''} ${files.length >= maxFiles ? 'full' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          multiple
          onChange={handleFileInputChange}
          disabled={disabled || files.length >= maxFiles}
          style={{ display: 'none' }}
        />
        
        <div className="drop-zone-content">
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="drop-zone-label">{label}</p>
          <p className="drop-zone-hint">
            {files.length >= maxFiles 
              ? `Достигнут лимит файлов (${maxFiles})` 
              : `Поддерживаемые форматы: ${acceptedExtensions}. Макс. ${maxFileSize / 1024 / 1024} МБ каждый, до ${maxFiles} файлов.`
            }
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file) => (
            <div key={file.id} className={`file-item ${file.status}`}>
              <div className="file-preview">
                {file.preview ? (
                  <img src={file.preview} alt={file.file.name} />
                ) : (
                  <div className="file-icon">📄</div>
                )}
              </div>
              <div className="file-info">
                <span className="file-name">{file.file.name}</span>
                <span className="file-size">{(file.file.size / 1024 / 1024).toFixed(2)} МБ</span>
                
                {file.status === 'error' && file.errorMessage && (
                  <span className="file-error">{file.errorMessage}</span>
                )}
                
                {file.status === 'uploading' && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${file.progress}%` }}
                    />
                    <span className="progress-text">{Math.round(file.progress)}%</span>
                  </div>
                )}
                
                {file.status === 'completed' && (
                  <span className="file-status completed">✓ Готово</span>
                )}
              </div>
              <button
                className="remove-file-btn"
                onClick={() => handleRemoveFile(file.id)}
                disabled={disabled}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DragDropUpload;
