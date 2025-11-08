'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  timestamp: Date;
};

type ChatResponse = {
  method: 'FRONTEND_TO_BLITZ' | 'MODULE_TO_FRONTEND' | 'GENAI_TO_FRONTEND';
  intent?: 'general_query' | 'cancellation' | 'order_query' | 'refund_query';
  response?: string;
  data?: Record<string, unknown>;
  error?: string;
  debug?: {
    businessId: string;
    workflowId: string;
    nodeId: string;
  };
};

type Business = {
  id: string;
  name: string;
  workflowId: string | null;
  hasWorkflow: boolean;
  hasGenAINode: boolean;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<{ status: string; message?: string; error?: string } | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load businesses on mount
  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const response = await fetch('/api/businesses');
        const data = await response.json();
        if (data.businesses) {
          setBusinesses(data.businesses);
          // Auto-select first business with GenAI node if available
          const businessWithGenAI = data.businesses.find((b: Business) => b.hasGenAINode);
          if (businessWithGenAI) {
            setSelectedBusinessId(businessWithGenAI.id);
          } else if (data.businesses.length > 0) {
            setSelectedBusinessId(data.businesses[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load businesses:', error);
      } finally {
        setIsLoadingBusinesses(false);
      }
    };

    loadBusinesses();
  }, []);

  // Clear test status when business changes
  useEffect(() => {
    setTestStatus(null);
  }, [selectedBusinessId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedBusinessId) return;

    // Check if the selected business has a configured GenAI node
    const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);
    if (!selectedBusiness?.hasGenAINode) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Error: The selected business workflow does not have a configured GenAI node. Please configure the GenAI Intent node in the workflow builder with an API key and model first.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          businessId: selectedBusinessId,
        }),
      });

      const data: ChatResponse = await response.json();

      if (!response.ok) {
        // Handle different error scenarios
        let errorMessage = data.error || 'Failed to send message';
        
        // Provide more helpful error messages
        if (errorMessage.includes('GenAI Intent node is not configured')) {
          errorMessage = 'Please configure the GenAI node in your workflow with an API key and model.';
        } else if (errorMessage.includes('API key is missing')) {
          errorMessage = 'GenAI node is missing an API key. Please configure it in the workflow builder.';
        } else if (errorMessage.includes('model is missing')) {
          errorMessage = 'GenAI node is missing a model selection. Please configure it in the workflow builder.';
        } else if (errorMessage.includes('No workflow found')) {
          errorMessage = 'No workflow found for this business. Please create a workflow first.';
        }
        
        throw new Error(errorMessage);
      }

      // Build response message based on method and intent
      let responseContent = data.response || 'No response received';
      
      // For specific intents (non-general), the response may include structured data
      // The GenAI node provides the response, and workflow processing would happen next
      // For now, we display the GenAI response directly
      // In a full implementation, FRONTEND_TO_BLITZ would trigger workflow processing

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        intent: data.intent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Log intent detection for debugging
      if (data.intent) {
        console.log('[Chat] Detected Intent:', data.intent);
        console.log('[Chat] Extracted Data:', data.data);
        console.log('[Chat] Method:', data.method);
        console.log('[Chat] Response Method:', data.method === 'GENAI_TO_FRONTEND' ? 'Direct Response' : 'Workflow Processing');
      }
      if (data.debug) {
        console.log('[Chat] Debug Info:', {
          businessId: data.debug.businessId,
          workflowId: data.debug.workflowId,
          nodeId: data.debug.nodeId,
        });
      }
    } catch (error) {
      console.error('[Chat] Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'An error occurred. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleTestAPI = async () => {
    if (!selectedBusinessId) {
      setTestStatus({ 
        status: 'error', 
        error: 'Please select a business first' 
      });
      return;
    }

    setTestStatus({ status: 'testing' });
    try {
      // Test API with the selected business ID
      const response = await fetch(`/api/chat?businessId=${encodeURIComponent(selectedBusinessId)}`);
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setTestStatus({ status: 'success', message: data.message });
      } else {
        // Provide more helpful error messages
        let errorMessage = data.error || data.message || 'API test failed';
        if (errorMessage.includes('GenAI Intent node is not configured')) {
          errorMessage = 'GenAI node is not configured for this business workflow. Please configure it in the workflow builder.';
        } else if (errorMessage.includes('API key is missing')) {
          errorMessage = 'GenAI node is missing an API key. Please configure it in the workflow builder.';
        } else if (errorMessage.includes('model is missing')) {
          errorMessage = 'GenAI node is missing a model selection. Please configure it in the workflow builder.';
        } else if (errorMessage.includes('No workflow found')) {
          errorMessage = 'No workflow found for this business. Please create a workflow first.';
        }
        setTestStatus({ status: 'error', error: errorMessage });
      }
    } catch (error) {
      setTestStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Network error',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Blitz Chat</h1>
          <div className="flex items-center gap-2">
            {/* Business Selection Dropdown */}
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              disabled={isLoadingBusinesses}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-slate-900 focus:outline-none focus:ring-0 disabled:opacity-50"
            >
              {isLoadingBusinesses ? (
                <option>Loading businesses...</option>
              ) : businesses.length === 0 ? (
                <option>No businesses available</option>
              ) : (
                businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                    {business.hasGenAINode ? ' ✓' : business.hasWorkflow ? ' (No GenAI)' : ' (No Workflow)'}
                  </option>
                ))
              )}
            </select>
            <button
              onClick={handleTestAPI}
              disabled={testStatus?.status === 'testing' || !selectedBusinessId}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              title={!selectedBusinessId ? 'Please select a business first' : 'Test if the selected business workflow has a configured GenAI node'}
            >
              {testStatus?.status === 'testing' ? 'Testing...' : 'Test API'}
            </button>
          </div>
        </div>
        {testStatus && (
          <div
            className={`mt-2 rounded-md px-3 py-2 text-sm ${
              testStatus.status === 'success'
                ? 'bg-green-50 text-green-800'
                : testStatus.status === 'error'
                  ? 'bg-red-50 text-red-800'
                  : 'bg-blue-50 text-blue-800'
            }`}
          >
            {testStatus.status === 'success' && (
              <span>✓ {testStatus.message}</span>
            )}
            {testStatus.status === 'error' && (
              <span>✗ {testStatus.error}</span>
            )}
            {testStatus.status === 'testing' && (
              <span>Testing workflow configuration...</span>
            )}
          </div>
        )}
        {selectedBusinessId && (() => {
          const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);
          if (!selectedBusiness) return null;
          
          if (!selectedBusiness.hasWorkflow) {
            return (
              <div className="mt-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                ⚠ Selected business does not have a workflow. Please create a workflow first in the workflow builder.
              </div>
            );
          }
          
          if (!selectedBusiness.hasGenAINode) {
            return (
              <div className="mt-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                ⚠ Selected business workflow does not have a configured GenAI node. Please add and configure a GenAI Intent node in the workflow builder.
              </div>
            );
          }
          
          return (
            <div className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
              ✓ GenAI node is configured. Ready to process messages.
            </div>
          );
        })()}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">Start a conversation to test the GenAI intent detection</p>
              <p className="mt-2 text-sm text-gray-400">
                Try: &quot;Where is my order?&quot; or &quot;I want to cancel my order&quot;
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.intent && (
                    <div className="mt-2 space-y-1 border-t border-gray-300 pt-2 text-xs">
                      <div>
                        <span className="font-semibold">Intent:</span>{' '}
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">
                          {message.intent.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-1 text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !selectedBusinessId
                ? 'Please select a business first'
                : !businesses.find((b) => b.id === selectedBusinessId)?.hasGenAINode
                  ? 'Please configure GenAI node in workflow builder first'
                  : 'Type your message... (Press Enter to send, Shift+Enter for new line)'
            }
            className="flex-1 resize-none rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-0"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={isLoading || !selectedBusinessId || !businesses.find((b) => b.id === selectedBusinessId)?.hasGenAINode}
          />
          <button
            onClick={handleSend}
            disabled={
              !input.trim() || 
              isLoading || 
              !selectedBusinessId ||
              !businesses.find((b) => b.id === selectedBusinessId)?.hasGenAINode
            }
            className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              !selectedBusinessId 
                ? 'Please select a business' 
                : !businesses.find((b) => b.id === selectedBusinessId)?.hasGenAINode
                  ? 'Please configure GenAI node for this business workflow first'
                  : 'Send message'
            }
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <div>
            Debug: Check browser console for intent detection logs
            {selectedBusinessId && (
              <span className="ml-2">
                | Business: {businesses.find((b) => b.id === selectedBusinessId)?.name || 'Unknown'}
              </span>
            )}
          </div>
          {selectedBusinessId && businesses.find((b) => b.id === selectedBusinessId)?.hasGenAINode && (
            <div className="flex items-center gap-1 text-green-600">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Workflow Ready</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
