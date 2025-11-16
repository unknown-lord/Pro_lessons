import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

// ========================================
// POST REQUEST HANDLER
// This function runs when someone sends a POST request to /api/generate-lesson
// ========================================
export async function POST(request: NextRequest) {
  try {
    // ========================================
    // STEP 1: PARSE REQUEST BODY
    // Extract the lesson outline from the incoming request
    // ========================================
    const { outline } = await request.json();

    // Validate that outline was provided
    if (!outline) {
      return NextResponse.json(
        { error: 'Outline is required' },
        { status: 400 } // 400 = Bad Request
      );
    }

    // ========================================
    // STEP 2: CREATE LESSON IN DATABASE
    // Insert a new row into the lessons table with status "Generating"
    // ========================================
    const { data: lesson, error: insertError } = await supabase
      .from('lessons')
      .insert({
        outline: outline,                    // User's input
        title: extractTitle(outline),        // Auto-generate title from outline
        status: 'Generating',                // Initial status
      })
      .select()  // Return the inserted row
      .single(); // We only inserted one row, so get it as an object (not array)

    // Handle database insertion errors
    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create lesson' },
        { status: 500 } // 500 = Internal Server Error
      );
    }

    // ========================================
    // STEP 3: TRIGGER ASYNC GENERATION
    // Start generating content in the background
    // We don't wait for it to finish (fire and forget)
    // ========================================
    generateLessonContent(lesson.id, outline);

    // ========================================
    // STEP 4: RETURN IMMEDIATE RESPONSE
    // Tell the client that lesson creation started successfully
    // ========================================
    return NextResponse.json({
      lessonId: lesson.id,
      status: 'Generating',
    });

  } catch (error) {
    // Catch any unexpected errors
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// HELPER FUNCTION: EXTRACT TITLE
// Creates a short title from the outline text
// ========================================
function extractTitle(outline: string): string {
  // Take first 6 words
  const words = outline.split(' ').slice(0, 6).join(' ');
  
  // If longer than 50 characters, truncate and add "..."
  return words.length > 50 ? words.substring(0, 50) + '...' : words;
}

// ========================================
// ASYNC FUNCTION: GENERATE LESSON CONTENT
// This runs in the background after we've already returned a response
// It calls Google Gemini AI and updates the database when done
// ========================================
async function generateLessonContent(lessonId: string, outline: string) {
  try {
    // ========================================
    // PREPARE AI TRACE LOG
    // Store information about the AI request for debugging
    // ========================================
    const trace: any = {
      prompt: `Generate a TypeScript educational module for: ${outline}`,
      timestamp: new Date().toISOString(),
      provider: undefined,
      model: undefined,
    };

    // ========================================
    // CHECK IF API KEY EXISTS
    // Get your FREE API key at: https://aistudio.google.com/app/apikey
    // ========================================
    const useHelicone = !!process.env.HELICONE_API_KEY;
    const useGemini = !!process.env.GEMINI_API_KEY;
    if (!useHelicone && !useGemini) {
      console.warn('⚠️ No AI keys set - using mock generation for testing');
    }

    // ========================================
    // EASTER EGG DETECTION 🎮
    // Special handling for "konami code" or "up up down down"
    // ========================================
    const isEasterEgg = outline.toLowerCase().includes('konami') || 
                        outline.toLowerCase().includes('up up down down');

    // Build the prompt based on whether it's an Easter egg
    const prompt = isEasterEgg 
      ? // EASTER EGG PROMPT 🎮
        `Generate a fun, retro TypeScript gaming Easter egg! Create an interactive Konami Code detector with:
        
- A TypeScript class that tracks arrow key presses
- The classic sequence: up, up, down, down, left, right, left, right, B, A
- A celebration function that triggers when completed
- Retro gaming ASCII art comments
- At least 3 different "cheat code" effects (god mode, 30 lives, etc.)
- Make it nostalgic and fun for developers!

Return ONLY the TypeScript code, no markdown formatting or explanations.`
      : // NORMAL PROMPT
        `Generate a complete, executable TypeScript module for an educational lesson based on this outline: "${outline}"

Requirements:
- Create an interactive quiz or educational content
- Use TypeScript with proper types
- Include functions that can be called/executed
- Make it educational and engaging
- Add comments explaining the code
- Include at least 3-5 questions or learning points

Return ONLY the TypeScript code, no markdown formatting or explanations.`;

    let content: string;

    // ========================================
    // GENERATE CONTENT (REAL AI OR MOCK)
    // ========================================
    if (useHelicone) {
      try {
        trace.provider = 'helicone';
        trace.model = 'gpt-4o-mini';
        content = await generateWithHelicone(prompt, trace);
      } catch (error) {
        console.warn('⚠️ Helicone/OpenAI failed, attempting Gemini. Error:', error);
        if (useGemini) {
          try {
            trace.provider = 'gemini';
            trace.model = 'gemini-2.5-flash';
            content = await generateWithGemini(prompt, trace);
          } catch (error2) {
            console.warn('⚠️ Gemini also failed, falling back to mock:', error2);
            content = generateMockLesson(outline, isEasterEgg);
            trace.output = content;
            trace.mock = true;
            trace.fallback_reason = error2 instanceof Error ? error2.message : String(error2);
          }
        } else {
          content = generateMockLesson(outline, isEasterEgg);
          trace.output = content;
          trace.mock = true;
          trace.fallback_reason = error instanceof Error ? error.message : String(error);
        }
      }
    } else if (useGemini) {
      try {
        trace.provider = 'gemini';
        trace.model = 'gemini-2.5-flash';
        content = await generateWithGemini(prompt, trace);
      } catch (error) {
        console.warn('⚠️ Gemini API failed, falling back to mock generation:', error);
        content = generateMockLesson(outline, isEasterEgg);
        trace.output = content;
        trace.mock = true;
        trace.fallback_reason = error instanceof Error ? error.message : String(error);
      }
    } else {
      content = generateMockLesson(outline, isEasterEgg);
      trace.output = content;
      trace.mock = true;
    }

    // ========================================
    // UPDATE DATABASE WITH GENERATED CONTENT
    // Change status to "Generated" and store the code
    // ========================================
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        content: content,      // The generated TypeScript code
        status: 'Generated',   // Update status
        trace: trace,          // Store AI trace for debugging
      })
      .eq('id', lessonId);  // Only update this specific lesson

    // Handle update errors
    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log(`✅ Successfully generated lesson ${lessonId}`);

    // ========================================
    // SUCCESS! 
    // The lesson is now in the database with status "Generated"
    // Realtime subscription will notify the frontend automatically
    // ========================================

  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // If anything goes wrong, mark the lesson as "Failed"
    // ========================================
    console.error('Generation error:', error);
    
    // Update the lesson status to Failed so user knows something went wrong
    await supabase
      .from('lessons')
      .update({
        status: 'Failed',
        trace: { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        },
      })
      .eq('id', lessonId);
  }
}

// ========================================
// HELPER: GENERATE WITH GEMINI API
// ========================================
async function generateWithGemini(prompt: string, trace: any): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ]
      }),
    }
  );

  // Check if API response is OK
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error response:', errorText);
    throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
  }

  // Parse Gemini's response
  const data = await response.json();
  console.log('Gemini API response:', JSON.stringify(data, null, 2));

  // Validate response structure
  if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
    console.error('Unexpected API response structure:', data);
    throw new Error('Invalid response structure from Gemini API');
  }

  const candidate = data.candidates[0];
  
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    console.error('No content found in response:', data);
    throw new Error('No content in Gemini API response');
  }

  // Extract the actual text content
  let content = candidate.content.parts[0].text;

  // Clean up markdown code blocks
  content = content
    .replace(/```typescript\n?/g, '')
    .replace(/```ts\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Add response metadata to trace
  trace.output = content;
  trace.response_metadata = {
    model: data.candidates[0].content.role || 'model',
    finishReason: candidate.finishReason,
    safetyRatings: candidate.safetyRatings,
  };

  return content;
}

// ========================================
// HELPER: GENERATE MOCK LESSON (for testing without API key)
// ========================================
function generateMockLesson(outline: string, isEasterEgg: boolean): string {
  if (isEasterEgg) {
    return `// 🎮 KONAMI CODE EASTER EGG 🎮
// ↑ ↑ ↓ ↓ ← → ← → B A

type KeyCode = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'KeyB' | 'KeyA';

class KonamiCodeDetector {
  private sequence: KeyCode[] = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ];
  private currentIndex: number = 0;

  constructor() {
    this.setupListener();
  }

  private setupListener(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === this.sequence[this.currentIndex]) {
        this.currentIndex++;
        if (this.currentIndex === this.sequence.length) {
          this.activate();
          this.currentIndex = 0;
        }
      } else {
        this.currentIndex = 0;
      }
    });
  }

  private activate(): void {
    console.log('🎮 KONAMI CODE ACTIVATED! 🎮');
    this.godMode();
    this.extraLives();
    this.unlockSecrets();
  }

  private godMode(): void {
    console.log('⚡ GOD MODE ENABLED ⚡');
    document.body.style.filter = 'hue-rotate(180deg)';
  }

  private extraLives(): void {
    console.log('❤️ +30 LIVES! ❤️');
  }

  private unlockSecrets(): void {
    console.log('🔓 ALL SECRETS UNLOCKED! 🔓');
  }
}

// Initialize the detector
const konami = new KonamiCodeDetector();
console.log('Try the Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A');`;
  }

  // Escape the template literal properly for the normal lesson
  const mockLesson = `// TypeScript Educational Module
// Topic: ` + outline + `

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

class Quiz {
  private questions: Question[] = [
    {
      id: 1,
      question: "What is TypeScript?",
      options: [
        "A JavaScript library",
        "A superset of JavaScript",
        "A backend framework",
        "A database"
      ],
      correctAnswer: 1,
      explanation: "TypeScript is a superset of JavaScript that adds static typing."
    },
    {
      id: 2,
      question: "What does the 'interface' keyword do?",
      options: [
        "Creates a class",
        "Defines a type structure",
        "Imports a module",
        "Exports a function"
      ],
      correctAnswer: 1,
      explanation: "Interfaces define the structure of objects in TypeScript."
    },
    {
      id: 3,
      question: "What is the purpose of generics?",
      options: [
        "To make code faster",
        "To create reusable components",
        "To compress code",
        "To add colors"
      ],
      correctAnswer: 1,
      explanation: "Generics allow creating reusable components that work with multiple types."
    }
  ];

  checkAnswer(questionId: number, answer: number): boolean {
    const question = this.questions.find(q => q.id === questionId);
    return question ? question.correctAnswer === answer : false;
  }

  getExplanation(questionId: number): string {
    const question = this.questions.find(q => q.id === questionId);
    return question ? question.explanation : "Question not found";
  }

  getAllQuestions(): Question[] {
    return this.questions;
  }
}

// Example usage:
const quiz = new Quiz();
console.log("Quiz loaded with", quiz.getAllQuestions().length, "questions");

export { Quiz, Question };`;

  return mockLesson;
}

// ========================================
// HOW TO GET YOUR FREE GEMINI API KEY:
// ========================================
// 1. Go to https://aistudio.google.com/app/apikey
// 2. Sign in with your Google account
// 3. Click "Create API Key"
// 4. Copy the key (starts with "AIza...")
// 5. Add to your .env.local file:
//    GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
// 6. Restart your dev server: bun dev
//
// FREE TIER LIMITS:
// - 15 requests per minute
// - 1,500 requests per day
// - More than enough for development!
// ========================================

// ========================================
// HOW THIS ALL WORKS TOGETHER:
// ========================================
// 1. User clicks "Generate" on frontend
// 2. Frontend calls POST /api/generate-lesson
// 3. This route creates a lesson with status "Generating"
// 4. We immediately return a response (don't wait for AI)
// 5. generateLessonContent() runs in background
// 6. It calls Google Gemini API to generate TypeScript code
// 7. Response validation ensures data structure is correct
// 8. We clean up any markdown formatting from the response
// 9. When done, it updates the lesson to "Generated"
// 10. Supabase realtime pushes update to frontend
// 11. Frontend automatically shows new status without refresh!
// ========================================
// ========================================
// HELPER: GENERATE WITH HELICONE (OpenAI SDK)
// ========================================
async function generateWithHelicone(prompt: string, trace: any): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.HELICONE_API_KEY!,
    baseURL: 'https://ai-gateway.helicone.ai/v1',
    defaultHeaders: {
      'Helicone-Auth': process.env.HELICONE_API_KEY!,
      'Helicone-Property-User': trace?.userId || 'anonymous',
      'Helicone-Property-TraceId': trace?.traceId || '',
      // Add more custom properties as needed
    },
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You generate executable TypeScript modules only. Respond with raw TypeScript without markdown.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const content = completion.choices?.[0]?.message?.content ?? '';
  const cleaned = (content || '')
    .replace(/```typescript\n?/g, '')
    .replace(/```ts\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  trace.response_metadata = {
    id: completion.id,
    created: completion.created,
    model: completion.model,
  };
  trace.output = cleaned;
  return cleaned;
}