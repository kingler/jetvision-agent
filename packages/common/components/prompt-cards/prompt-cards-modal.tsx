'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, Flex } from '@repo/ui';
import { STATIC_PROMPTS_DATA, PromptCard, PromptCategory } from '../../utils/prompts-parser';

interface PromptCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: PromptCard) => void;
}

export const PromptCardsModal: React.FC<PromptCardsModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = STATIC_PROMPTS_DATA.filter(category => {
    if (!searchQuery) return true;
    
    const matchesCategory = category.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrompt = category.prompts.some(prompt => 
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return matchesCategory || matchesPrompt;
  });

  const handleSelectPrompt = useCallback((prompt: PromptCard) => {
    onSelectPrompt(prompt);
    onClose();
  }, [onSelectPrompt, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative mx-4 w-full max-w-4xl max-h-[80vh] bg-background rounded-xl border border-border shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M8 6h13" />
                  <path d="M8 12h13" />
                  <path d="M8 18h13" />
                  <path d="M3 6h.01" />
                  <path d="M3 12h.01" />
                  <path d="M3 18h.01" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Prompt Library
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose from our professional prompt collection
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-border">
            <div className="relative">
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[500px]">
            {/* Categories Sidebar */}
            <div className="w-72 border-r border-border bg-secondary/20 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Categories
                </h3>
                <div className="space-y-2">
                  {filteredCategories.map((category) => (
                    <button
                      key={category.slug}
                      onClick={() => setSelectedCategory(
                        selectedCategory === category.slug ? null : category.slug
                      )}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200",
                        selectedCategory === category.slug
                          ? "bg-primary/10 border border-primary/20 text-primary"
                          : "hover:bg-secondary/50 text-foreground"
                      )}
                    >
                      <span className="text-xl">{category.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-none mb-1">
                          {category.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {category.count} prompts
                        </div>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(
                          "transition-transform duration-200",
                          selectedCategory === category.slug ? "rotate-90" : ""
                        )}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompts Grid */}
            <div className="flex-1 overflow-y-auto">
              {selectedCategory ? (
                <div className="p-6">
                  {(() => {
                    const category = filteredCategories.find(c => c.slug === selectedCategory);
                    if (!category) return null;
                    
                    return (
                      <>
                        <div className="flex items-center gap-3 mb-6">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {category.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {category.prompts.length} professional prompts
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {category.prompts
                            .filter(prompt => 
                              !searchQuery || 
                              prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              prompt.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              prompt.description.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((prompt) => (
                            <motion.div
                              key={prompt.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="group cursor-pointer"
                              onClick={() => handleSelectPrompt(prompt)}
                            >
                              <div className="p-4 rounded-lg border border-border bg-background hover:bg-secondary/30 hover:border-primary/30 transition-all duration-200">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                                      {prompt.title}
                                    </h4>
                                    <div className={cn(
                                      "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border",
                                      category.color
                                    )}>
                                      {prompt.category}
                                    </div>
                                  </div>
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
                                    className="text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <path d="M7 17L17 7" />
                                    <path d="M7 7h10v10" />
                                  </svg>
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {prompt.description}
                                </p>
                                
                                <div className="bg-secondary/50 rounded-md p-3 border-l-2 border-primary/20">
                                  <p className="text-sm text-foreground font-medium">
                                    "{prompt.prompt}"
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground"
                      >
                        <path d="M8 6h13" />
                        <path d="M8 12h13" />
                        <path d="M8 18h13" />
                        <path d="M3 6h.01" />
                        <path d="M3 12h.01" />
                        <path d="M3 18h.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Select a Category
                    </h3>
                    <p className="text-muted-foreground">
                      Choose a category from the sidebar to explore professional prompts
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-secondary/10">
            <p className="text-xs text-muted-foreground text-center">
              {STATIC_PROMPTS_DATA.reduce((total, category) => total + category.count, 0)} professional prompts • 
              Optimized for JetVision operations
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};