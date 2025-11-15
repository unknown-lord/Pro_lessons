export interface Lesson {
  id: string;
  outline: string;
  title: string | null;
  content: string | null;
  status: 'Generating' | 'Generated' | 'Failed';
  trace: any;
  created_at: string;
}

export interface GenerateLessonRequest {
  outline: string;
}

export interface GenerateLessonResponse {
  lessonId: string;
  status: string;
}
