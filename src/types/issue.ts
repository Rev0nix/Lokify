export const issueCategories = ['Pothole', 'Streetlight', 'Garbage', 'Water'] as const

export type IssueCategory = (typeof issueCategories)[number]

export interface Issue {
  id: string | number
  title: string
  description: string
  category: IssueCategory
  latitude: number | null
  longitude: number | null
  user_id: string
  created_at?: string
}