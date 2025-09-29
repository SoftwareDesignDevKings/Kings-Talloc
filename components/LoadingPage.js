import React, { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';

const LoadingPage = ({ withBackground = true }) => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount(prevCount => {
        const newCount = prevCount >= 4 ? 1 : prevCount + 1;
        return newCount;
      });
    }, 500);

    return () => {
      console.log('Cleaning up interval');
      clearInterval(interval);
    };
  }, []);

  const dots = '.'.repeat(dotCount);
  const backgroundStyle = 'tw-fixed tw-inset-0 tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500'
  const textColor = withBackground ? 'text-white' : 'text-dark';

  return (
    <div className={`d-flex align-items-center justify-content-center ${backgroundStyle}`}>
      <div className="d-flex flex-column align-items-center justify-content-center">
        <Spinner
          animation="border"
          variant={withBackground ? 'light' : 'dark'}
          style={{ width: '2rem', height: '2rem' }}
        />
        <span className={`fs-5 mt-2 ${textColor}`}>Loading{dots}</span>
      </div>
    </div>
  );
};

export default LoadingPage;
