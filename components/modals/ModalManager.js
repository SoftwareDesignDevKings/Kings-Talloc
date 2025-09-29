"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalStack, setModalStack] = useState([]);

  const openModal = useCallback((modalId) => {
    setModalStack(prev => {
      if (!prev.includes(modalId)) {
        return [...prev, modalId];
      }
      return prev;
    });
  }, []);

  const closeModal = useCallback((modalId) => {
    setModalStack(prev => prev.filter(id => id !== modalId));
  }, []);

  const closeAllModals = useCallback(() => {
    setModalStack([]);
  }, []);

  const getZIndex = useCallback((modalId) => {
    const index = modalStack.indexOf(modalId);
    if (index === -1) return 0;

    // Base z-index 1000, each modal gets +10 for backdrop and +20 for content
    const baseZ = 1000 + (index * 30);
    return {
      backdrop: baseZ,
      content: baseZ + 10
    };
  }, [modalStack]);

  const isModalOpen = useCallback((modalId) => {
    return modalStack.includes(modalId);
  }, [modalStack]);

  const value = {
    openModal,
    closeModal,
    closeAllModals,
    getZIndex,
    isModalOpen,
    modalCount: modalStack.length
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export default ModalProvider;