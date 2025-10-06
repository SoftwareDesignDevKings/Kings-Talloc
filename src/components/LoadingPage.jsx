import React, { useEffect, useState } from 'react';

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
      clearInterval(interval);
    };
  }, []);

  const dots = '.'.repeat(dotCount);
  const backgroundStyle = withBackground
    ? 'tw-fixed tw-inset-0 tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500'
    : 'tw-fixed tw-inset-0 tw-bg-white';

  return (
    <div className={`tw-flex tw-items-center tw-justify-center ${backgroundStyle}`}>
      <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
        <div className="tw-relative tw-w-16 tw-h-16">
          <div className={`tw-absolute tw-inset-0 tw-border-4 ${withBackground ? 'tw-border-purple-300' : 'tw-border-purple-200'} tw-rounded-full`}></div>
          <div className={`tw-absolute tw-inset-0 tw-border-4 tw-border-transparent ${withBackground ? 'tw-border-t-white' : 'tw-border-t-purple-600'} tw-rounded-full tw-animate-spin`}></div>
        </div>
        <span className={`tw-text-lg tw-font-medium ${withBackground ? 'tw-text-white' : 'tw-text-gray-700'}`}>
          Loading{dots}
        </span>
      </div>
    </div>
  );
};

export default LoadingPage;
