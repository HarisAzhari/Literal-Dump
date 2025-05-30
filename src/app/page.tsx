"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { Loader2, FileText, Send, RefreshCw, TrendingUp, Scale, PenTool } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

type Mode = 'contract' | 'trend' | 'content';

export default function ContractAnalyzer() {
  const [question, setQuestion] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentMode, setCurrentMode] = useState<Mode>('contract');

  // API endpoint (adjust if your backend is running on a different URL)
  const API_URL = 'https://api.dialektika.io/intel';

  const analyzeContract = async () => {
    if (!question.trim()) {
      const titles = {
        contract: "Question Required",
        trend: "Question Required", 
        content: "Question Required"
      };
      
      const descriptions = {
        contract: "Please enter a contract question or clause to analyze.",
        trend: "Please enter a question about trends to analyze.",
        content: "Please enter a content request to generate."
      };
      
      toast({
        title: titles[currentMode],
        description: descriptions[currentMode],
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError('');
    setExplanation(''); // Clear previous explanation

    try {
      // Use different endpoint based on mode
      const endpoints = {
        contract: '/generate',
        trend: '/generate-trend',
        content: '/generate-content'
      };
      
      const response = await fetch(`${API_URL}${endpoints[currentMode]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Directly decode and append the text chunk
          const chunk = decoder.decode(value, { stream: true });
          
          // Simply append the plain text chunk to the explanation
          setExplanation(prev => prev + chunk);
        }
      } else {
        throw new Error("Response body is null");
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      const errorTitles = {
        contract: "Analysis Failed",
        trend: "Trend Analysis Failed",
        content: "Content Generation Failed"
      };
      
      toast({
        title: errorTitles[currentMode],
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setQuestion('');
    setExplanation('');
    setError('');
  };

  const toggleMode = () => {
    const modes: Mode[] = ['contract', 'trend', 'content'];
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setCurrentMode(modes[nextIndex]);
    clearAll(); // Clear content when switching modes
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      
      toast({
        title: "Service Status",
        description: data.message || "Service is running",
        variant: data.status === "healthy" ? "default" : "destructive",
      });
    } catch {
      toast({
        title: "Service Unavailable",
        description: "Could not connect to the contract analysis service",
        variant: "destructive",
      });
    }
  };

  // Function to format text with bold styling
  const formatText = (text: string): React.ReactNode => {
    if (!text) return text;
    
    // Handle bold text with double asterisks
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    if (parts.length === 1) return text;
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        const boldText = part.substring(2, part.length - 2);
        return <strong key={index}>{boldText}</strong>;
      }
      return part;
    });
  };

  // Function to render the explanation with proper formatting
  const renderExplanation = () => {
    if (!explanation) return null;
    
    const lines = explanation.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;
    let inList = false;
    let listItems: React.ReactElement[] = [];
    let inTable = false;
    let tableRows: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Handle horizontal rules
      if (trimmedLine === '---') {
        elements.push(<hr key={key++} className="my-4 border-t border-gray-300 dark:border-gray-700" />);
        return;
      }
      
      // Handle headings
      if (trimmedLine.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="text-xl font-bold mt-5 mb-2">
            {formatText(trimmedLine.substring(3))}
          </h2>
        );
        return;
      }
      
      if (trimmedLine.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-lg font-semibold mt-4 mb-2">
            {formatText(trimmedLine.substring(4))}
          </h3>
        );
        return;
      }
      
      // Handle bullet points
      if (trimmedLine.startsWith('* ')) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        
        listItems.push(
          <li key={listItems.length} className="my-1">
            {formatText(trimmedLine.substring(2))}
          </li>
        );
        
        // If this is the last line or the next line is not a list item
        if (index === lines.length - 1 || 
            !lines[index + 1].trim().startsWith('* ')) {
          elements.push(
            <ul key={key++} className="list-disc pl-6 my-3 space-y-1">
              {listItems}
            </ul>
          );
          inList = false;
        }
        return;
      }
      
      // Handle blockquotes
      if (trimmedLine.startsWith('> ')) {
        elements.push(
          <blockquote key={key++} className="pl-4 border-l-4 border-gray-300 dark:border-gray-700 italic my-3">
            {formatText(trimmedLine.substring(2))}
          </blockquote>
        );
        return;
      }
      
      // Handle tables
      if (trimmedLine.startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        
        tableRows.push(line);
        
        // If this is the last line or the next line doesn't start with |
        if (index === lines.length - 1 || 
            !lines[index + 1].trim().startsWith('|')) {
          elements.push(renderTable(tableRows, key++));
          inTable = false;
        }
        return;
      }
      
      // Handle empty lines
      if (trimmedLine === '') {
        // Only add a space if not after a heading or before a list
        const prevLineIsHeading = index > 0 && 
          (lines[index - 1].trim().startsWith('## ') || 
           lines[index - 1].trim().startsWith('### '));
        
        const nextLineIsList = index < lines.length - 1 && 
           lines[index + 1].trim().startsWith('* ');
        
        if (!prevLineIsHeading && !nextLineIsList) {
          elements.push(<div key={key++} className="h-2"></div>);
        }
        return;
      }
      
      // Regular paragraphs (everything else)
      elements.push(
        <p key={key++} className="my-2">
          {formatText(line)}
        </p>
      );
    });
    
    return elements;
  };
  
  // Helper to render tables
  const renderTable = (rows: string[], key: number) => {
    // Skip processing if not enough rows for a table
    if (rows.length < 2) return <div key={key}>{rows[0]}</div>;
    
    // Process table data
    const tableData = rows.map(row => {
      return row.split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());
    });
    
    // Check if second row is separator row (has only dashes and pipes)
    const hasSeparator = rows.length > 1 && 
      rows[1].split('|').every(cell => 
        cell.trim() === '' || /^[\s-]+$/.test(cell.trim())
      );
    
    const hasHeader = hasSeparator;
    
    return (
      <div key={key} className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-300 border">
          {hasHeader && (
            <thead>
              <tr>
                {tableData[0].map((header, i) => (
                  <th key={i} className="px-3 py-2 text-left text-sm font-semibold bg-gray-100 dark:bg-gray-800">
                    {formatText(header)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-200">
            {tableData.slice(hasHeader ? 2 : 0).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 text-sm border-t">
                    {formatText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center max-w-full px-4">
          <div className="flex items-center gap-2 font-semibold">
            {currentMode === 'trend' ? (
              <TrendingUp className="h-5 w-5" />
            ) : currentMode === 'content' ? (
              <PenTool className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            <span>{currentMode === 'trend' ? 'Trend Analyzer' : currentMode === 'content' ? 'Content Generator' : 'Contract Analyzer'}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleMode}
              className="flex items-center gap-2"
            >
              {currentMode === 'contract' ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Switch to Trend Mode
                </>
              ) : currentMode === 'trend' ? (
                <>
                  <PenTool className="h-4 w-4" />
                  Switch to Content Mode
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4" />
                  Switch to Contract Mode
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={checkHealth}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Service
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6 md:py-10 max-w-full px-4">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentMode === 'trend' ? 'Ask about trends' : currentMode === 'content' ? 'Ask about content' : 'Ask about a contract'}
              </CardTitle>
              <CardDescription>
                {currentMode === 'trend' ? 'Ask questions about current trends, market analysis, or emerging patterns'
                  : currentMode === 'content' ? 'Enter a content request to generate content'
                  : 'Enter contract language or ask about a legal concept to get a clear explanation'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={currentMode === 'trend' ? "Ask about trends, market analysis, or emerging patterns..."
                  : currentMode === 'content' ? "Enter a content request to generate content..."
                  : "Paste contract clauses or ask questions about contracts here..."
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-32 resize-y"
              />
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button variant="outline" onClick={clearAll}>Clear</Button>
              <Button onClick={analyzeContract} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentMode === 'trend' ? 'Analyzing Trends...' : currentMode === 'content' ? 'Generating Content...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {currentMode === 'trend' ? 'Analyze Trends' : currentMode === 'content' ? 'Generate Content' : 'Analyze'}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {explanation && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>{currentMode === 'trend' ? 'Trend Analysis' : currentMode === 'content' ? 'Content Generation' : 'Analysis'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  {renderExplanation()}
                </div>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                Powered by Gemini AI
              </CardFooter>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t py-4">
        <div className="container flex items-center justify-center max-w-full px-4">
          <p className="text-sm text-muted-foreground">
            {currentMode === 'trend' ? 'Trend Analysis API' : currentMode === 'content' ? 'Content Generation API' : 'Contract Analysis API'} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
}