export type ClimbType = 'boulder' | 'sport'

export type GradeSystem = 'v-scale' | 'french'

export type ClimbResult = 'onsight' | 'flash' | 'send' | 'attempt'

export interface Grade {
  readonly code: string
  readonly order: number
}

export interface RouteEntryDraft {
  readonly climbType: ClimbType
  readonly gradeSystem: GradeSystem
  readonly gradeCode: string
  readonly result: ClimbResult
  readonly attemptCount: number
}

export interface RouteEntry extends RouteEntryDraft {
  readonly id: string
  readonly climbedAt: string
  readonly location?: string
  readonly routeName?: string
  readonly notes?: string
  readonly createdAt: string
  readonly updatedAt: string
}
