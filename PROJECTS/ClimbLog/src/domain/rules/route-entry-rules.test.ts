import { describe, expect, it } from 'vitest'

import type { RouteEntryDraft } from '../models/climb'
import {
  getDefaultAttemptCount,
  getResultsForClimbType,
  isCompletedResult,
  validateRouteEntryDraft,
} from './route-entry-rules'

const validBoulderDraft: RouteEntryDraft = {
  climbType: 'boulder',
  gradeSystem: 'v-scale',
  gradeCode: 'V4',
  result: 'flash',
  attemptCount: 1,
}

describe('route entry rules', () => {
  it('offers onsight only for sport climbing', () => {
    expect(getResultsForClimbType('boulder')).toEqual([
      'flash',
      'send',
      'attempt',
    ])
    expect(getResultsForClimbType('sport')).toContain('onsight')
  })

  it('recognizes completed results', () => {
    expect(isCompletedResult('onsight')).toBe(true)
    expect(isCompletedResult('flash')).toBe(true)
    expect(isCompletedResult('send')).toBe(true)
    expect(isCompletedResult('attempt')).toBe(false)
  })

  it('provides safe default attempt counts', () => {
    expect(getDefaultAttemptCount('onsight')).toBe(1)
    expect(getDefaultAttemptCount('flash')).toBe(1)
    expect(getDefaultAttemptCount('send')).toBe(2)
    expect(getDefaultAttemptCount('attempt')).toBe(1)
  })

  it('accepts a valid boulder record', () => {
    expect(validateRouteEntryDraft(validBoulderDraft)).toEqual([])
  })

  it('rejects onsight for bouldering', () => {
    const errors = validateRouteEntryDraft({
      ...validBoulderDraft,
      result: 'onsight',
    })

    expect(errors.map((error) => error.code)).toContain('result-not-allowed')
  })

  it('rejects a grade system that does not match the climb type', () => {
    const errors = validateRouteEntryDraft({
      ...validBoulderDraft,
      gradeSystem: 'french',
      gradeCode: '6b',
    })

    expect(errors.map((error) => error.code)).toContain(
      'grade-system-mismatch',
    )
  })

  it('rejects an unknown grade', () => {
    const errors = validateRouteEntryDraft({
      ...validBoulderDraft,
      gradeCode: 'V99',
    })

    expect(errors.map((error) => error.code)).toContain('unknown-grade')
  })

  it('requires exactly one attempt for flash and onsight', () => {
    const flashErrors = validateRouteEntryDraft({
      ...validBoulderDraft,
      attemptCount: 2,
    })
    const onsightErrors = validateRouteEntryDraft({
      climbType: 'sport',
      gradeSystem: 'french',
      gradeCode: '6a',
      result: 'onsight',
      attemptCount: 2,
    })

    expect(flashErrors.map((error) => error.code)).toContain(
      'invalid-attempt-count',
    )
    expect(onsightErrors.map((error) => error.code)).toContain(
      'invalid-attempt-count',
    )
  })

  it('requires at least two attempts for send', () => {
    const errors = validateRouteEntryDraft({
      ...validBoulderDraft,
      result: 'send',
      attemptCount: 1,
    })

    expect(errors.map((error) => error.code)).toContain(
      'invalid-attempt-count',
    )
  })

  it('requires a positive whole number of attempts', () => {
    for (const attemptCount of [0, -1, 1.5]) {
      const errors = validateRouteEntryDraft({
        ...validBoulderDraft,
        result: 'attempt',
        attemptCount,
      })

      expect(errors.map((error) => error.code)).toContain(
        'invalid-attempt-count',
      )
    }
  })
})
