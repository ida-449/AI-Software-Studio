import type { ClimbType, Grade, GradeSystem } from '../models/climb'

function createGrades(codes: readonly string[]): readonly Grade[] {
  return Object.freeze(
    codes.map((code, order) => Object.freeze({ code, order })),
  )
}

export const V_SCALE_GRADES = createGrades([
  'VB',
  'V0',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
  'V7',
  'V8',
  'V9',
  'V10',
  'V11',
  'V12',
  'V13',
  'V14',
  'V15',
  'V16',
  'V17',
] as const)

export const FRENCH_GRADES = createGrades([
  '3',
  '4a',
  '4b',
  '4c',
  '5a',
  '5b',
  '5c',
  '6a',
  '6a+',
  '6b',
  '6b+',
  '6c',
  '6c+',
  '7a',
  '7a+',
  '7b',
  '7b+',
  '7c',
  '7c+',
  '8a',
  '8a+',
  '8b',
  '8b+',
  '8c',
  '8c+',
  '9a',
  '9a+',
  '9b',
  '9b+',
  '9c',
] as const)

export const GRADE_SYSTEM_BY_CLIMB_TYPE: Readonly<
  Record<ClimbType, GradeSystem>
> = Object.freeze({
  boulder: 'v-scale',
  sport: 'french',
})

export function getGradesForClimbType(
  climbType: ClimbType,
): readonly Grade[] {
  return climbType === 'boulder' ? V_SCALE_GRADES : FRENCH_GRADES
}

export function findGrade(
  gradeSystem: GradeSystem,
  gradeCode: string,
): Grade | undefined {
  const grades = gradeSystem === 'v-scale' ? V_SCALE_GRADES : FRENCH_GRADES
  return grades.find((grade) => grade.code === gradeCode)
}
