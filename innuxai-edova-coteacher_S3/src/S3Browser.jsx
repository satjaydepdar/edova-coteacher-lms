import React, { useState, useEffect } from 'react';
import { Folder, File, FileImage, FileText, Video, ChevronRight, Download, Eye, X, BookOpen } from 'lucide-react';
import { listObjects, objectUrl } from './s3';

export default function S3Browser({ onOpenCourse }) {
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [items, setItems] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchBucketContents(currentPrefix);
  }, [currentPrefix]);

  const fetchBucketContents = async (prefix) => {
    setLoading(true);
    setError(null);
    try {
      // Using ListObjectsV2 API over HTTP (paginated)
      const { prefixes, contents } = await listObjects(prefix, { delimiter: true });

      // Extract folders, keeping just the folder name without the trailing slash
      const folders = prefixes.map(fullPath => {
        const name = fullPath.substring(prefix.length, fullPath.length - 1);
        return { name, path: fullPath };
      }).filter(f => f.name !== ''); // Filter out empty names just in case

      // Extract files
      const files = contents.map(c => {
        const fullPath = c.Key;
        const name = fullPath.substring(prefix.length);
        return {
          name,
          path: fullPath,
          size: c.Size,
          lastModified: c.LastModified
        };
      }).filter(f => f.name !== '' && f.size > 0); // Filter out the directory objects themselves

      setItems({ folders, files });

    } catch (err) {
      console.error("Error fetching S3 contents:", err);
      setError(err.message || "Could not load bucket contents. Ensure bucket is public and CORS is configured.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path) => {
    setCurrentPrefix(path);
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setCurrentPrefix('');
      return;
    }
    const parts = currentPrefix.split('/').filter(Boolean);
    const newPrefix = parts.slice(0, index + 1).join('/') + '/';
    setCurrentPrefix(newPrefix);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <FileImage className="item-icon file-icon" />;
    if (['mp4', 'webm', 'mov'].includes(ext)) return <Video className="item-icon file-icon" />;
    if (['txt', 'md', 'csv', 'json', 'xml'].includes(ext)) return <FileText className="item-icon file-icon" />;
    return <File className="item-icon file-icon" />;
  };

  const isPreviewable = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp4', 'webm'].includes(ext);
  };

  const breadcrumbParts = currentPrefix.split('/').filter(Boolean);

  return (
    <div className="container">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="breadcrumb-item">
            <button 
              className={`breadcrumb-link ${currentPrefix === '' ? 'active' : ''}`}
              onClick={() => handleBreadcrumbClick(-1)}
            >
              Root
            </button>
          </div>
          {breadcrumbParts.map((part, index) => (
            <React.Fragment key={index}>
              <ChevronRight size={16} className="breadcrumb-separator" />
              <div className="breadcrumb-item">
                <button 
                  className={`breadcrumb-link ${index === breadcrumbParts.length - 1 ? 'active' : ''}`}
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {part}
                </button>
              </div>
            </React.Fragment>
          ))}
        </div>
        
        {currentPrefix !== '' && (
          <button 
            onClick={() => onOpenCourse(currentPrefix)}
            className="download-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            <BookOpen size={16} /> Open Course Player Here
          </button>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="message-container">
          <div className="spinner">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <p>Loading files from S3...</p>
        </div>
      ) : error ? (
        <div className="message-container" style={{ borderColor: '#ef4444' }}>
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
          <button 
            onClick={() => fetchBucketContents(currentPrefix)}
            style={{ 
              padding: '0.5rem 1rem', 
              background: 'var(--surface-color)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-main)', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      ) : items.folders.length === 0 && items.files.length === 0 ? (
        <div className="message-container">
          <Folder size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>This folder is empty.</p>
        </div>
      ) : (
        <div className="grid">
          {items.folders.map(folder => (
            <div 
              key={folder.path} 
              className="item-card"
              onClick={() => handleNavigate(folder.path)}
            >
              <Folder className="item-icon" />
              <span className="item-name">{folder.name}</span>
            </div>
          ))}

          {items.files.map(file => (
            <div 
              key={file.path} 
              className="item-card"
              onClick={() => setSelectedFile(file)}
            >
              {getFileIcon(file.name)}
              <span className="item-name">{file.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* File Viewer Modal */}
      {selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedFile.name}</h3>
              <button className="close-btn" onClick={() => setSelectedFile(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {(() => {
                const url = objectUrl(selectedFile.path);
                const ext = selectedFile.name.split('.').pop().toLowerCase();
                
                if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
                  return <img src={url} alt={selectedFile.name} className="preview-image" />;
                }
                
                if (['mp4', 'webm'].includes(ext)) {
                  return (
                    <video controls className="preview-video">
                      <source src={url} type={`video/${ext}`} />
                      Your browser does not support the video tag.
                    </video>
                  );
                }
                
                return (
                  <div className="unsupported-preview">
                    <File size={64} opacity={0.5} />
                    <p>Preview not available for this file type.</p>
                    <a href={url} download target="_blank" rel="noreferrer" className="download-btn">
                      <Download size={18} /> Download File
                    </a>
                  </div>
                );
              })()}
            </div>
            {isPreviewable(selectedFile.name) && (
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
                <a 
                  href={objectUrl(selectedFile.path)} 
                  download 
                  target="_blank" 
                  rel="noreferrer"
                  className="download-btn"
                  style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}
                >
                  <Download size={16} /> Open in New Tab
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
