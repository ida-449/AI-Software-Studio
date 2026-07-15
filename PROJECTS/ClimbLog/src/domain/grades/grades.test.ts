import { describe, expect, it } from 'vitest'

import {
  FRENCH_GRADES,
  V_SCALE_GRADES,
  findGrade,
  getGradesForClimbType,
} from './grades'

describe('grade definitions', () => {
  it('keeps V Scale grades unique and ordered from VB to V17', () => {
    const codes = V_SCALE_GRADES.map((grade) => grade.code)

    expect(codes[0]).toBe('VB')
    expect(codes.at(-1)).toBe('V17')
    expect(new Set(codes).size).toBe(codes.length)
    expect(V_SCALE_GRADES.map((grade) => grade.order)).toEqual(
      codes.map((_, index) => index),
    )
  })

  it('keeps French grades unique and ordered from 3 to 9c', () => {
    const codes = FRENCH_GRADES.map((grade) => grade.code)

    expect(codes[0]).toBe('3')
    expect(codes.at(-1)).toBe('9c')
    expect(new Set(codes).size).toBe(codes.length)
    expect(FRENCH_GRADES.map((grade) => grade.order)).toEqual(
      codes.map((_, index) => index),
    )
  })

  it('returns only the grade system that belongs to a climb type', () => {
    expect(getGradesForClimbType('boulder')).toBe(V_SCALE_GRADES)
    expect(getGradesForClimbType('sport')).toBe(FRENCH_GRADES)
  })

  it('does not find a grade in another grade system', () => {
    expect(findGrade('v-scale', 'V4')?.order).toBeGreaterThan(0)
    expect(findGrade('french', '6b+')?.order).toBeGreaterThan(0)
    expect(findGrade('v-scale', '6b+')).toBeUndefined()
    expect(findGrade('french', 'V4')).toBeUndefined()
  })
})
