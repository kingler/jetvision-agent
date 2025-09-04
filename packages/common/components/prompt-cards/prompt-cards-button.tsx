'use client';

import React, { useState } from 'react';
import { PromptCardsModal } from './prompt-cards-modal';
import { PromptCard } from '../../utils/prompts-parser';

interface PromptCardsButtonProps {
  onSelectPrompt: (prompt: PromptCard) => void;
  className?: string;
}

export const PromptCardsButton: React.FC<PromptCardsButtonProps> = ({
  onSelectPrompt,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectPrompt = (prompt: PromptCard) => {
    onSelectPrompt(prompt);
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`inline-flex items-center gap-2 justify-center font-medium whitespace-nowrap transition-colors focus-visible:outline-none [&>svg]:text-muted-foreground disabled:opacity-70 hover:bg-quaternary text-muted-foreground opacity-100 hover:text-foreground h-7 min-w-7 text-xs md:text-sm rounded-lg ${className}`}
        data-state="closed"
        title="Browse Prompt Library"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tabler-icon tabler-icon-list"
        >
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      </button>

      <PromptCardsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelectPrompt={handleSelectPrompt}
      />
    </>
  );
};