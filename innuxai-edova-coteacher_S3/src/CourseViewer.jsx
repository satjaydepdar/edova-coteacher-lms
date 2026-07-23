import React, { useState, useEffect } from 'react';
import { PlayCircle, FileText, CheckCircle, ChevronDown, ChevronUp, Video, ChevronLeft } from 'lucide-react';
import { listObjects, objectUrl } from './s3';

export default function CourseViewer({ coursePrefix, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);

  useEffect(() => {
    fetchCourseContents();
  }, [coursePrefix]);

  const fetchCourseContents = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all objects under the selected subject (coursePrefix), paginated
      const { contents } = await listObjects(coursePrefix);

      const allFiles = contents
        .filter(c => c.Size > 0) // filter out directories
        .map(c => {
          const fullPath = c.Key;
          const relativePath = fullPath.substring(coursePrefix.length);
          const pathParts = relativePath.split('/');

          // Expected: Chapter-Name/Topic-File.mp4
          let chapterName = "General";
          let fileName = relativePath;

          if (pathParts.length >= 2) {
            chapterName = pathParts[0];
            fileName = pathParts.slice(1).join('/');
          }

          return {
            path: fullPath,
            chapter: chapterName,
            name: fileName,
            type: getFileType(fileName)
          };
        });

      // Group by chapter
      const chapterMap = {};
      allFiles.forEach(file => {
        if (!chapterMap[file.chapter]) {
          chapterMap[file.chapter] = [];
        }
        chapterMap[file.chapter].push(file);
      });

      const chapterList = Object.keys(chapterMap).map(chapterName => ({
        name: chapterName,
        topics: chapterMap[chapterName]
      }));

      setChapters(chapterList);
      
      // Expand the first chapter by default
      if (chapterList.length > 0) {
        setExpandedChapters({ [chapterList[0].name]: true });
        // Select the first topic
        if (chapterList[0].topics.length > 0) {
          setSelectedTopic(chapterList[0].topics[0]);
        }
      }

    } catch (err) {
      setError(err.message || "Failed to load course. Please check CORS settings.");
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'document';
  };

  const toggleChapter = (chapterName) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterName]: !prev[chapterName]
    }));
  };

  if (loading) {
    return (
      <div className="course-loading">
        <div className="spinner"><PlayCircle size={40} /></div>
        <p>Loading course content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-error">
        <p>{error}</p>
        <button onClick={fetchCourseContents}>Retry</button>
      </div>
    );
  }

  const courseName = coursePrefix.split('/').filter(Boolean).pop();

  return (
    <div className="course-viewer">
      <div className="course-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} /> Back to Library
        </button>
        <h2>{courseName}</h2>
      </div>

      <div className="course-layout">
        {/* Main Content Area (Video Player) */}
        <div className="course-main">
          {selectedTopic ? (
            <div className="player-container">
              {selectedTopic.type === 'video' ? (
                <video 
                  controls 
                  autoPlay 
                  key={selectedTopic.path} 
                  className="video-player"
                  controlsList="nodownload"
                >
                  <source src={objectUrl(selectedTopic.path)} />
                  Your browser does not support the video tag.
                </video>
              ) : selectedTopic.type === 'pdf' ? (
                <iframe 
                  src={objectUrl(selectedTopic.path)} 
                  className="pdf-viewer"
                  title={selectedTopic.name}
                />
              ) : (
                <div className="generic-viewer">
                  <FileText size={64} opacity={0.5} />
                  <h3>{selectedTopic.name}</h3>
                  <a href={objectUrl(selectedTopic.path)} target="_blank" rel="noreferrer" className="download-btn">
                    Download File
                  </a>
                </div>
              )}
              
              <div className="topic-info">
                <h3>{selectedTopic.name.split('.')[0]}</h3> {/* Remove extension */}
                <p>Chapter: {selectedTopic.chapter}</p>
              </div>
            </div>
          ) : (
            <div className="no-topic-selected">
              <PlayCircle size={64} opacity={0.2} />
              <p>Select a topic from the sidebar to begin.</p>
            </div>
          )}
        </div>

        {/* Sidebar (Course Content) */}
        <div className="course-sidebar">
          <div className="sidebar-header">
            <h3>Course Content</h3>
          </div>
          
          <div className="chapter-list">
            {chapters.map((chapter) => (
              <div key={chapter.name} className="chapter-item">
                <button 
                  className="chapter-header" 
                  onClick={() => toggleChapter(chapter.name)}
                >
                  <div className="chapter-title">
                    <span className="chapter-name">{chapter.name}</span>
                    <span className="chapter-meta">{chapter.topics.length} lectures</span>
                  </div>
                  {expandedChapters[chapter.name] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {expandedChapters[chapter.name] && (
                  <div className="topic-list">
                    {chapter.topics.map((topic) => (
                      <button 
                        key={topic.path}
                        className={`topic-item ${selectedTopic?.path === topic.path ? 'active' : ''}`}
                        onClick={() => setSelectedTopic(topic)}
                      >
                        <div className="topic-icon">
                          {topic.type === 'video' ? <PlayCircle size={14} /> : <FileText size={14} />}
                        </div>
                        <span className="topic-name">{topic.name.split('.')[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
