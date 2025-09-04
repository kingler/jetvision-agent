'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/ui';
import { STATIC_PROMPTS_DATA, PromptCard, PromptCategory } from '../../utils/prompts-parser';
import { IconSearch, IconX, IconEdit, IconCheck, IconArrowRight } from '@tabler/icons-react';

interface PromptCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: PromptCard) => void;
  onInsertPrompt?: (prompt: string, fullPrompt: string) => void;
}

export const PromptCardsModal: React.FC<PromptCardsModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  onInsertPrompt
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [editingCards, setEditingCards] = useState<Set<string>>(new Set());
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});

  // Flatten all prompts for grid display with filtering
  const allPrompts = STATIC_PROMPTS_DATA.flatMap(category => 
    category.prompts.map(prompt => ({...prompt, categoryIcon: category.icon, categoryColor: category.color}))
  );
  
  const filteredPrompts = allPrompts.filter(prompt => {
    if (!searchQuery) return true;
    return (
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSelectPrompt = useCallback((prompt: PromptCard) => {
    onSelectPrompt(prompt);
    onClose();
  }, [onSelectPrompt, onClose]);
  
  const handleInsertPrompt = useCallback((prompt: PromptCard) => {
    if (onInsertPrompt) {
      onInsertPrompt(prompt.prompt, prompt.fullPrompt);
      onClose();
    }
  }, [onInsertPrompt, onClose]);
  
  const toggleCardExpansion = useCallback((cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
        // Also remove from editing state when collapsing
        setEditingCards(prevEdit => {
          const newEditSet = new Set(prevEdit);
          newEditSet.delete(cardId);
          return newEditSet;
        });
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);
  
  const toggleCardEditing = useCallback((cardId: string, currentPrompt: string) => {
    setEditingCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
        // Initialize edited content
        setEditedContent(prevContent => ({
          ...prevContent,
          [cardId]: currentPrompt
        }));
      }
      return newSet;
    });
  }, []);
  
  const saveCardEdit = useCallback((cardId: string) => {
    // In a real app, this would save to backend
    setEditingCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(cardId);
      return newSet;
    });
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
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
          className="relative mx-4 w-full max-w-7xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Prompt Library
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Choose from {allPrompts.length} professional prompts
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <IconX size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Content - Grid Layout */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {filteredPrompts.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <IconSearch size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No prompts found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your search terms
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPrompts.map((prompt) => {
                  const isExpanded = expandedCards.has(prompt.id);
                  const isEditing = editingCards.has(prompt.id);
                  
                  return (
                    <motion.div
                      key={prompt.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "group relative rounded-lg transition-all",
                        "bg-white dark:bg-gray-900",
                        "border border-gray-200 dark:border-gray-800",
                        "shadow-md hover:shadow-lg",
                        "hover:border-gray-300 dark:hover:border-gray-700",
                        isExpanded && "md:col-span-2 lg:col-span-2 xl:col-span-2"
                      )}
                    >
                      <div className="p-4">
                        {/* Card Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <prompt.categoryIcon size={20} className="text-gray-600 dark:text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
                                {prompt.title}
                              </h4>
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {prompt.category}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCardExpansion(prompt.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            >
                              <IconEdit size={14} className="text-gray-500 dark:text-gray-400" />
                            </button>
                            {onInsertPrompt && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInsertPrompt(prompt); }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                title="Insert prompt"
                              >
                                <IconArrowRight size={14} className="text-gray-500 dark:text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Basic Content */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                          {prompt.description}
                        </p>
                        
                        {/* Prompt Preview */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                            "{prompt.prompt}"
                          </p>
                        </div>
                        
                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-4 overflow-hidden"
                            >
                              {/* Full Prompt Section */}
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Full Prompt:
                                </label>
                                {isEditing ? (
                                  <textarea
                                    value={editedContent[prompt.id] || prompt.fullPrompt}
                                    onChange={(e) => setEditedContent(prev => ({
                                      ...prev,
                                      [prompt.id]: e.target.value
                                    }))}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="Enter full prompt..."
                                  />
                                ) : (
                                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {prompt.fullPrompt}
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); saveCardEdit(prompt.id); }}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                      <IconCheck size={14} />
                                      Save
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleCardEditing(prompt.id, prompt.fullPrompt); }}
                                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleCardEditing(prompt.id, prompt.fullPrompt); }}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                                    >
                                      <IconEdit size={14} />
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSelectPrompt(prompt); }}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                      <IconArrowRight size={14} />
                                      Use Prompt
                                    </button>
                                    {onInsertPrompt && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleInsertPrompt(prompt); }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                      >
                                        <IconArrowRight size={14} />
                                        Insert
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {/* Quick Actions for non-expanded cards */}
                        {!isExpanded && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSelectPrompt(prompt); }}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <IconArrowRight size={14} />
                              Select
                            </button>
                            {onInsertPrompt && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInsertPrompt(prompt); }}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                                title="Insert into chat"
                              >
                                Insert
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {allPrompts.length} professional prompts • Optimized for JetVision operations
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};