import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface Problem {
  id: number
  question_text: string
  question_image_url?: string
  problem_type: 'multiple_choice' | 'short_answer' | 'true_false'
  difficulty?: 'easy' | 'medium' | 'hard'
  subject?: string
  topic?: string
  tags: string[]
  choices: Array<{
    choice_index: number
    text: string
  }>
  is_bookmarked?: boolean
}

interface Session {
  id: number
  name?: string
  status: 'active' | 'paused' | 'completed'
  progress: {
    current_index: number
    total_problems: number
    completed_count: number
    skipped_count: number
    bookmarked_count: number
    progress_percentage: number
  }
}

interface AppState {
  // Current session
  currentSession: Session | null
  currentProblem: Problem | null
  currentProblemIndex: number

  // UI state
  showExplanation: boolean
  isDarkMode: boolean
  sidebarOpen: boolean

  // Statistics
  stats: {
    totalAttempts: number
    correctAttempts: number
    accuracyRate: number
    recentAttempts7d: number
  } | null

  // Actions
  setCurrentSession: (session: Session | null) => void
  setCurrentProblem: (problem: Problem | null) => void
  setCurrentProblemIndex: (index: number) => void
  setShowExplanation: (show: boolean) => void
  toggleDarkMode: () => void
  setSidebarOpen: (open: boolean) => void
  setStats: (stats: AppState['stats']) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        currentSession: null,
        currentProblem: null,
        currentProblemIndex: 0,
        showExplanation: false,
        isDarkMode: false,
        sidebarOpen: false,
        stats: null,

        // Actions
        setCurrentSession: (session) => set({ currentSession: session }),
        setCurrentProblem: (problem) => set({ currentProblem: problem }),
        setCurrentProblemIndex: (index) => set({ currentProblemIndex: index }),
        setShowExplanation: (show) => set({ showExplanation: show }),
        toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setStats: (stats) => set({ stats }),
      }),
      {
        name: 'examply-storage',
        partialize: (state) => ({
          isDarkMode: state.isDarkMode,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    )
  )
)