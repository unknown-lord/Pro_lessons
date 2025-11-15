import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import CodePreview from '@/components/CodePreview';

// ========================================
// PAGE COMPONENT (Server Component)
// This is a Next.js Server Component that runs on the server
// It fetches data before rendering the page
// ========================================
export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;  // In Next.js 15+, params is a Promise!
}) {
  // ========================================
  // AWAIT PARAMS (Next.js 15+ Requirement)
  // In Next.js 15, params is now a Promise and must be awaited
  // ========================================
  const { id } = await params;

  // ========================================
  // FETCH LESSON FROM DATABASE
  // Get the specific lesson by ID from Supabase
  // ========================================
  const { data: lesson, error } = await supabase
    .from('lessons')           // From the lessons table
    .select('*')               // Select all columns
    .eq('id', id)              // Where id equals the URL parameter (now using awaited id)
    .single();                 // Get single result (not array)

  // ========================================
  // HANDLE NOT FOUND
  // If lesson doesn't exist or there's an error, show 404 page
  // ========================================
  if (error || !lesson) {
    notFound();  // Next.js built-in 404 handler
  }

  // ========================================
  // JSX RENDER - THE UI STRUCTURE
  // ========================================
  return (
    // MAIN CONTAINER
    // Full screen height with gradient background matching homepage
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      
      {/* CONTENT WRAPPER */}
      {/* Centers content and limits max width to 5xl (1024px) */}
      <div className="max-w-5xl mx-auto">
        
        {/* ========================================
            BACK NAVIGATION LINK
            Link component from Next.js for client-side navigation
            ======================================== */}
        <Link
          href="/"
          className="text-indigo-600 hover:text-indigo-800 mb-6 inline-block"
        >
          ← Back to Lessons
        </Link>

        {/* ========================================
            MAIN LESSON CARD
            White card containing all lesson information
            ======================================== */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          
          {/* LESSON TITLE */}
          {/* Shows the lesson title or "Lesson" as fallback */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {lesson.title || 'Lesson'}
          </h1>
          
          {/* ========================================
              OUTLINE SECTION
              Shows the original user input that created this lesson
              ======================================== */}
          <div className="mb-6">
            <span className="text-sm text-gray-500">Outline:</span>
            <p className="text-gray-700 mt-1">{lesson.outline}</p>
          </div>

          {/* ========================================
              CONDITIONAL RENDERING BASED ON STATUS
              Shows different UI depending on lesson.status
              ======================================== */}
          
          {/* ========================================
              CASE 1: GENERATING STATE
              Show loading spinner while AI generates content
              ======================================== */}
          {lesson.status === 'Generating' && (
            <div className="text-center py-12">
              {/* ANIMATED SPINNER */}
              {/* animate-spin is a Tailwind class that rotates the element */}
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating lesson content...</p>
            </div>
          )}

          {/* ========================================
              CASE 2: FAILED STATE
              Show error message if generation failed
              ======================================== */}
          {lesson.status === 'Failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800">
                Failed to generate lesson. Please try again.
              </p>
            </div>
          )}

          {/* ========================================
              CASE 3: GENERATED STATE (SUCCESS!)
              Show the generated TypeScript code
              This only renders if:
              1. lesson.status === 'Generated' AND
              2. lesson.content exists (is not null/undefined)
              ======================================== */}
          {lesson.status === 'Generated' && lesson.content && (
            // CodePreview is a custom component (we'll create this separately)
            // It handles syntax highlighting and displays the code nicely
            <CodePreview code={lesson.content} />
          )}
        </div>

        {/* ========================================
            AI TRACE LOG SECTION (OPTIONAL)
            Shows debugging information about the AI generation
            Only displays if trace data exists
            ======================================== */}
        {lesson.trace && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">AI Trace Log</h2>
            
            {/* PRE-FORMATTED JSON DISPLAY */}
            {/* Shows the trace object as formatted JSON
                - JSON.stringify converts object to string
                - Second parameter (null) is a replacer function (we don't need one)
                - Third parameter (2) adds 2-space indentation for readability */}
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(lesson.trace, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}