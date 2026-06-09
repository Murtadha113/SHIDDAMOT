// ═══════════════════════════════════════════
//  أنواع البيانات — متطابقة مع تطبيق اللعبة
// ═══════════════════════════════════════════

export interface Category {
  id: string
  name: string
  imageUrl: string
  order?: number
  groupId?: string
  isHidden?: boolean
}

export interface Question {
  id: string
  categoryId: string
  type: 'text' | 'image' | 'audio' | 'video'
  content: string
  mediaUrl?: string
  answer: string
  answerMediaUrl?: string
  answerMediaType?: 'image' | 'audio' | 'video'
  hint?: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  isTrialQuestion?: boolean
  options?: string[]
}

export const POINTS_MAP: Record<Question['difficulty'], number> = {
  easy: 15,
  medium: 30,
  hard: 50,
}

export const DIFFICULTY_LABEL: Record<Question['difficulty'], string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
}

export const TYPE_LABEL: Record<Question['type'], string> = {
  text: '📝 نص',
  image: '🖼️ صورة',
  audio: '🎵 صوت',
  video: '🎬 فيديو',
}
export interface Category {
  id: string
  name: string
  imageUrl: string
  order?: number
  groupId?: string
  isHidden?: boolean
  isMajlis?: boolean
}
