'use client';
import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";


import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lesson } from '@/lib/types';


export default function Home() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  // Stores the text user types in the textarea
  const [outline, setOutline] = useState('');
  
  // Array of all lessons fetched from Supabase database
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Boolean flag to show loading state on the Generate button
  const [isGenerating, setIsGenerating] = useState(false);

  // Whether the server has a Gemini API key configured
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);

  // ========================================
  // FETCH LESSONS & REALTIME SUBSCRIPTION
  // ========================================
  
  // useEffect runs when component first loads (mounts)
  useEffect(() => {
    // Initial fetch of all lessons from database
    fetchLessons();
    // Check Gemini key presence on server
    fetch('/api/gemini-status')
      .then((res) => res.json())
      .then((data) => setHasGeminiKey(!!data.hasKey))
      .catch(() => setHasGeminiKey(false));
    
    // Subscribe to Supabase realtime updates
    // This automatically updates the UI when the database changes
    const channel = supabase
      .channel('lessons-channel')
      .on(
        'postgres_changes',
        { 
          event: '*',              // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',        // Database schema
          table: 'lessons'         // Table name
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchLessons(); // Re-fetch lessons when database changes
        }
      )
      .subscribe();

    // Cleanup function: unsubscribe when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty array = run only once on mount

  // Function to fetch all lessons from Supabase
  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: false }); // Newest first

    if (error) {
      console.error('Error fetching lessons:', error);
      return;
    }

    setLessons(data || []); // Update state with fetched lessons
  };

  // ========================================
  // GENERATE LESSON HANDLER
  // ========================================
  
  const handleGenerate = async () => {
    // Don't proceed if textarea is empty or just whitespace
    if (!outline.trim()) return;

    setIsGenerating(true); // Show "Generating..." on button

    try {
      // Call our API endpoint to create and generate lesson
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate lesson');
      }

      setOutline(''); // Clear the textarea after successful submission
      fetchLessons(); // Refresh the table immediately
    } catch (error) {
      console.error('Error generating lesson:', error);
      alert('Failed to generate lesson. Please try again.');
    } finally {
      setIsGenerating(false); // Hide loading state
    }
  };

  // ========================================
  // JSX RENDER - THE UI STRUCTURE
  // ========================================
  
  return (
    // MAIN CONTAINER
    // - Full screen height with gradient background (blue to indigo)
    // - Padding on all sides
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      
      {/* CONTENT WRAPPER */}
      {/* Centers content and limits max width to 6xl (1152px) */}
      <div className="max-w-6xl mx-auto">
        {/* Warning banner if Gemini key is missing */}
        {hasGeminiKey === false && (
          <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 p-4">
            <p className="font-medium">Gemini API not configured</p>
            <p className="text-sm mt-1">
              Add <code className="font-mono">GEMINI_API_KEY</code> to your <code className="font-mono">.env.local</code> to enable real AI generation. Get a free key at{' '}
              <a href="https://aistudio.google.com/app/apikey" className="underline" target="_blank" rel="noreferrer">Google AI Studio</a>.
              Without it, mock content is generated.
            </p>
          </div>
        )}
        
        {/* PAGE TITLE */}
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          📚 Digital Lessons
        </h1>

        {/* ========================================
            SECTION 1: GENERATION FORM
            White card with textarea and button
            ======================================== */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Lesson</h2>
          
          {/* CONTROLLED TEXTAREA */}
          {/* - value={outline} means the textarea displays whatever is in the outline state
              - onChange updates the state every time user types
              - This is called a "controlled component" in React */}
          <textarea
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="Enter lesson outline (e.g., 'A quiz on Florida history')"
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          
          {/* GENERATE BUTTON */}
          {/* - onClick calls handleGenerate function
              - disabled when: already generating OR textarea is empty
              - Button text changes dynamically based on isGenerating state */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !outline.trim()}
            className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {/* CONDITIONAL TEXT: Shows different text based on loading state */}
            {isGenerating ? 'Generating...' : 'Generate Lesson'}
          </button>
        </div>

        {/* ========================================
            SECTION 2: LESSONS LIST TABLE
            Shows all created lessons with their status
            ======================================== */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Lessons</h2>
          
          {/* CONDITIONAL RENDERING: Shows different UI based on lessons array length */}
          {lessons.length === 0 ? (
            // ========================================
            // EMPTY STATE: Show when no lessons exist
            // ========================================
            <p className="text-gray-500 text-center py-8">
              No lessons yet. Create your first one!
            </p>
          ) : (
            // ========================================
            // TABLE: Show when lessons array has items
            // ========================================
            <div className="overflow-x-auto">
              <table className="w-full">
                
                {/* TABLE HEADER - Column titles */}
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Outline</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Created</th>
                    <th className="text-left py-3 px-4">Action</th>
                  </tr>
                </thead>
                
                {/* TABLE BODY - Actual lesson data */}
                <tbody>
                  {/* MAP FUNCTION: Loop through lessons array and create a row for each lesson */}
                  {/* This transforms data (lessons array) into UI elements (table rows) */}
                  {lessons.map((lesson) => (
                    // Each row needs a unique "key" prop for React's rendering optimization
                    <tr key={lesson.id} className="border-b hover:bg-gray-50">
                      
                      {/* ========================================
                          COLUMN 1: LESSON TITLE
                          ======================================== */}
                      <td className="py-3 px-4 font-medium">
                        {/* If lesson.title exists, show it. Otherwise show 'Untitled' */}
                        {/* This is using the || (OR) operator as a fallback */}
                        {lesson.title || 'Untitled'}
                      </td>
                      
                      {/* ========================================
                          COLUMN 2: LESSON OUTLINE (truncated)
                          ======================================== */}
                      <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                        {lesson.outline}
                      </td>
                      
                      {/* ========================================
                          COLUMN 3: STATUS BADGE (with dynamic colors)
                          ======================================== */}
                      <td className="py-3 px-4">
                        <span
                          // DYNAMIC CLASSES using template literal
                          // The classes change based on lesson.status value
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            // Nested ternary operator to check status and apply appropriate colors
                            lesson.status === 'Generated'
                              ? 'bg-green-100 text-green-800'    // Green badge for completed
                              : lesson.status === 'Generating'
                              ? 'bg-yellow-100 text-yellow-800'  // Yellow badge for in-progress
                              : 'bg-red-100 text-red-800'        // Red badge for failed
                          }`}
                        >
                          {/* Display the actual status text */}
                          {lesson.status}
                        </span>
                      </td>
                      
                      {/* ========================================
                          COLUMN 4: CREATION DATE (formatted)
                          ======================================== */}
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {/* Convert ISO timestamp to readable date format like "11/14/2025" */}
                        {new Date(lesson.created_at).toLocaleDateString()}
                      </td>
                      
                      {/* ========================================
                          COLUMN 5: ACTION LINK (conditional)
                          ======================================== */}
                      <td className="py-3 px-4">
                        {/* CONDITIONAL RENDERING: Show different content based on status */}
                        {lesson.status === 'Generated' ? (
                          // If lesson is generated, show clickable link to view it
                          <Link
                            href={`/lessons/${lesson.id}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            View →
                          </Link>
                        ) : (
                          // Otherwise, show disabled "Pending" text
                          <span className="text-gray-400">Pending...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
