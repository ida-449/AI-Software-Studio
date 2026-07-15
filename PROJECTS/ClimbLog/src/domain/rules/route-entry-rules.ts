import { GRADE_SYSTEM_BY_CLIMB_TYPE, findGrade } from '../grades/grades'
import type {
  ClimbResult,
  ClimbType,
  RouteEntryDraft,
} from '../models/climb'

const RESULTS_BY_CLIMB_TYPE: Readonly<
  Record<ClimbType, readonly ClimbResult[]>
> = {
  boulder: ['flash', 'send', 'attempt'] as const,
  sport: ['onsight', 'flash', 'send', 'attempt'] as const,
}

export type RouteEntryValidationErrorCode =
  | 'grade-system-mismatch'
  | 'unknown-grade'
  | 'result-not-allowed'
  | 'invalid-attempt-count'

export interface RouteEntryValidationError {
  readonly code: RouteEntryValidationErrorCode
  readonly message: string
}

export function getResultsForClimbType(
  climbType: ClimbType,
): readonly ClimbResult[] {
  return RESULTS_BY_CLIMB_TYPE[climbType]
}

export function isCompletedResult(result: ClimbResult): boolean {
  return result !== 'attempt'
}

export function getDefaultAttemptCount(result: ClimbResult): number {
  if (result === 'onsight' || result === 'flash') {
    return 1
  }

  return result === 'send' ? 2 : 1
}

export function validateRouteEntryDraft(
  draft: RouteEntryDraft,
): readonly RouteEntryValidationError[] {
  const errors: RouteEntryValidationError[] = []
  const expectedGradeSystem = GRADE_SYSTEM_BY_CLIMB_TYPE[draft.climbType]

  if (draft.gradeSystem !== expectedGradeSystem) {
    errors.push({
      code: 'grade-system-mismatch',
      message: `The ${draft.climbType} climb type requires the ${expectedGradeSystem} grade system.`,
    })
  } else if (!findGrade(draft.gradeSystem, draft.gradeCode)) {
    errors.push({
      code: 'unknown-grade',
      message: `The grade ${draft.gradeCode} is not part of the ${draft.gradeSystem} grade system.`,
    })
  }

  if (!RESULTS_BY_CLIMB_TYPE[draft.climbType].includes(draft.result)) {
    errors.push({
      code: 'result-not-allowed',
      message: `The ${draft.result} result is not available for ${draft.climbType}.`,
    })
  }

  if (!Number.isInteger(draft.attemptCount) || draft.attemptCount < 1) {
    errors.push({
      code: 'invalid-attempt-count',
      message: 'Attempt count must be a positive whole number.',
    })
  } else if (
    (draft.result === 'onsight' || draft.result === 'flash') &&
    draft.attemptCount !== 1
  ) {
    errors.push({
      code: 'invalid-attempt-count',
      message: `${draft.result} must have exactly one attempt.`,
    })
  } else if (draft.result === 'send' && draft.attemptCount < 2) {
    errors.push({
      code: 'invalid-attempt-count',
      message: 'Send must have at least two attempts.',
    })
  }

  return errors
}
