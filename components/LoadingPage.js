import React from 'react';

const LoadingPage = ({ withBackground = true }) => {
  return (
    <div className={`tw-flex tw-items-center tw-justify-center ${withBackground ? 'tw-fixed tw-inset-0 tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500' : 'tw-w-full tw-h-full'}`}>
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center">
        <svg className={`tw-w-8 tw-h-8 ${withBackground ? 'tw-text-white' : 'tw-text-black'} tw-animate-spin`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="tw-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="tw-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.963 7.963 0 014 12H0c0 2.21.896 4.21 2.343 5.657l1.414-1.414z"></path>
        </svg>
        <span className={`tw-text-lg tw-mt-2 ${withBackground ? 'tw-text-white' : 'tw-text-black'}`}>Loading...</span>
      </div>
    </div>
  );
};

export default LoadingPage;
