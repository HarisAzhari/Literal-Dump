"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  role: 'user' | 'assistant';
  message: string;
  isStreaming?: boolean;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_URL = 'http://127.0.0.1:3000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', message: userMessage }]);
    
    // Add a placeholder for the assistant's response
    setMessages(prev => [...prev, { role: 'assistant', message: '', isStreaming: true }]);
    
    setIsLoading(true);

    try {
      // 🔥 FIX: Properly format chat history for backend
      const chatHistoryForBackend = messages
        .filter(msg => !msg.isStreaming && msg.message.trim()) // Exclude empty/streaming messages
        .map(({ role, message }) => ({
          role: role.toUpperCase(), // Convert 'user' -> 'USER', 'assistant' -> 'ASSISTANT'
          message: message
        }));

      console.log('📤 Sending chat history:', chatHistoryForBackend); // Debug log

      const response = await fetch(`${API_URL}/generate-influencer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          chat_history: chatHistoryForBackend // 🔥 Send properly formatted history
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let accumulatedMessage = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the Uint8Array to text
        const text = new TextDecoder().decode(value);
        accumulatedMessage += text;

        // Update the last message with the accumulated text
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.message = accumulatedMessage;
          }
          return newMessages;
        });
      }

      // Mark the message as no longer streaming
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'assistant') {
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });

    } catch (err) {
      setError('Failed to get response from the server');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to get response from the server',
        variant: "destructive",
      });
      
      // Remove the streaming message if there was an error
      setMessages(prev => prev.filter(msg => !msg.isStreaming));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center max-w-full px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Bot className="h-5 w-5" />
            <span>Analytics Chat Assistant</span>
          </div>
          {/* 🔥 DEBUG: Show chat history count */}
          <div className="ml-auto text-sm text-muted-foreground">
            Messages: {messages.filter(m => !m.isStreaming).length}
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6 md:py-10 max-w-full px-4">
        <div className="grid gap-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 h-[600px] overflow-y-auto mb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap">
                        {message.message || (message.isStreaming && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about analytics..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-4">
        <div className="container flex items-center justify-center max-w-full px-4">
          <p className="text-sm text-muted-foreground">
            Analytics Chat Assistant &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
}