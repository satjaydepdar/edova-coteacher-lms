import React, { useState } from 'react';
import S3Browser from './S3Browser';
import CourseViewer from './CourseViewer';
import './index.css';

function App() {
  const [activeCoursePrefix, setActiveCoursePrefix] = useState(null);

  return (
    <>
      <header className="header">
        <h1>{activeCoursePrefix ? "Course Player" : "Edova Coteacher"}</h1>
      </header>
      
      {activeCoursePrefix ? (
        <CourseViewer 
          coursePrefix={activeCoursePrefix} 
          onBack={() => setActiveCoursePrefix(null)} 
        />
      ) : (
        <S3Browser onOpenCourse={setActiveCoursePrefix} />
      )}
    </>
  );
}

export default App;
