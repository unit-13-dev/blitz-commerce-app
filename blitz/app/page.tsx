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
  method: 'USER_TO_BLITZ' | 'MODULE_TO_FRONTEND' | 'GENAI_TO_FRONTEND';
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedBusinessId) return;

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
        throw new Error(data.error || 'Failed to send message');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No response received',
        intent: data.intent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Log intent detection for debugging
      if (data.intent) {
        console.log('[Chat] Detected Intent:', data.intent);
        console.log('[Chat] Extracted Data:', data.data);
        console.log('[Chat] Method:', data.method);
      }
      if (data.debug) {
        console.log('[Chat] Debug Info:', data.debug);
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
    setTestStatus({ status: 'testing' });
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setTestStatus({ status: 'success', message: data.message });
      } else {
        setTestStatus({ status: 'error', error: data.error || 'API test failed' });
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
              disabled={testStatus?.status === 'testing'}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
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
              <span>✓ API is working: {testStatus.message}</span>
            )}
            {testStatus.status === 'error' && <span>✗ Error: {testStatus.error}</span>}
          </div>
        )}
        {selectedBusinessId && !businesses.find((b) => b.id === selectedBusinessId)?.hasGenAINode && (
          <div className="mt-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            ⚠ Selected business does not have a configured GenAI node. Please configure the workflow first.
          </div>
        )}
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
                    <div className="mt-2 border-t border-gray-300 pt-2 text-xs">
                      <span className="font-semibold">Intent:</span> {message.intent}
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
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-0"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !selectedBusinessId}
            className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Debug: Check browser console for intent detection logs
          {selectedBusinessId && (
            <span className="ml-2">
              | Business: {businesses.find((b) => b.id === selectedBusinessId)?.name || 'Unknown'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
