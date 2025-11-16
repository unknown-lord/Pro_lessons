'use client';  // This makes it a Client Component (can use React hooks and browser APIs)

import { useState, useEffect } from 'react';
import Prism from 'prismjs';                        // Syntax highlighting library
import 'prismjs/themes/prism-tomorrow.css';         // Dark theme for code
import 'prismjs/components/prism-typescript';       // TypeScript language support

// ========================================
// TYPESCRIPT INTERFACE
// Defines the props (properties) this component accepts
// ========================================
interface CodePreviewProps {
  code: string;  // The TypeScript code to display (required prop)
}

// ========================================
// COMPONENT DEFINITION
// React functional component that takes CodePreviewProps
// ========================================
export default function CodePreview({ code }: CodePreviewProps) {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  // Track which tab is currently active
  // Type: 'code' or 'preview'
  // Default: 'code' (starts on Code View tab)
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

  // ========================================
  // SYNTAX HIGHLIGHTING EFFECT
  // Runs after component renders to apply Prism.js highlighting
  // ========================================
  const [highlighted, setHighlighted] = useState('');

  useEffect(() => {
    // Highlight code only on client
    setHighlighted(Prism.highlight(code, Prism.languages.typescript, 'typescript'));
  }, [code]);

  // ========================================
  // JSX RENDER - THE UI STRUCTURE
  // ========================================
  return (
    <div>
      {/* ========================================
          TAB NAVIGATION
          Two clickable tabs to switch between views
          ======================================== */}
      <div className="flex border-b mb-4">
        
        {/* CODE VIEW TAB */}
        <button
          onClick={() => setActiveTab('code')}  // When clicked, set active tab to 'code'
          // DYNAMIC CLASSES: Different styles based on whether this tab is active
          className={`px-6 py-3 font-medium ${
            activeTab === 'code'
              // If this tab is active: indigo text with bottom border
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              // If this tab is NOT active: gray text with hover effect
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Code View
        </button>
        
        {/* PREVIEW TAB */}
        <button
          onClick={() => setActiveTab('preview')}  // When clicked, set active tab to 'preview'
          // Same dynamic styling pattern as Code View tab
          className={`px-6 py-3 font-medium ${
            activeTab === 'preview'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Preview (Experimental)
        </button>
      </div>

      {/* ========================================
          TAB CONTENT
          Shows different content based on activeTab state
          ======================================== */}
      
      {/* CONDITIONAL RENDERING: Ternary operator to show one of two views */}
      {activeTab === 'code' ? (
        // ========================================
        // CODE VIEW: Syntax-highlighted code display
        // ========================================
        <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
          <pre className="text-sm language-typescript" tabIndex={0}>
            <code
              className="language-typescript"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </pre>
        </div>
      ) : (
        // ========================================
        // PREVIEW VIEW: Experimental execution area
        // Currently just shows a placeholder
        // In a real implementation, this could use a sandboxed JS runner
        // ========================================
        <div className="bg-gray-50 rounded-lg p-6">
          {/* INFO MESSAGE */}
          <p className="text-sm text-gray-600 mb-4">
            Preview mode: Copy the code above and run it in your TypeScript environment.
          </p>
          
          {/* PLACEHOLDER CONTENT AREA */}
          <div className="bg-white border rounded-lg p-4">
            <p className="text-gray-500">
              Safe execution coming soon! For now, copy and test the code in your IDE.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}