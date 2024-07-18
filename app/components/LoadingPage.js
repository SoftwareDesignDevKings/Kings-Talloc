import React from 'react';

const LoadingPage = ({ withBackground = true }) => {
  return (
    <div className={`flex items-center justify-center ${withBackground ? 'fixed inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' : 'w-full h-full'}`}>
      <div className="flex flex-col items-center justify-center">
        <svg className={`w-8 h-8 ${withBackground ? 'text-white' : 'text-black'} animate-spin`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.963 7.963 0 014 12H0c0 2.21.896 4.21 2.343 5.657l1.414-1.414z"></path>
        </svg>
        <span className={`text-lg mt-2 ${withBackground ? 'text-white' : 'text-black'}`}>Loading...</span>
      </div>
    </div>
  );
};

export default LoadingPage;
