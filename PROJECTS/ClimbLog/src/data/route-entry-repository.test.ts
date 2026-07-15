import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { RouteEntry } from '../domain/models/climb'
import { RouteEntryRepository } from './route-entry-repository'

const entry = (id: string, overrides: Partial<RouteEntry> = {}): RouteEntry => ({
  id, climbType: 'boulder', gradeSystem: 'v-scale', gradeCode: 'V4',
  result: 'flash', attemptCount: 1, climbedAt: '2026-07-16T10:00:00.000Z',
  createdAt: '2026-07-16T10:00:00.000Z', updatedAt: '2026-07-16T10:00:00.000Z',
  ...overrides,
})

describe('RouteEntryRepository', () => {
  let repository: RouteEntryRepository
  beforeEach(async () => { repository = await RouteEntryRepository.open(`test-${crypto.randomUUID()}`) })
  afterEach(() => repository.close())

  it('creates, reads, updates and deletes entries', async () => {
    await repository.put(entry('one'))
    expect((await repository.get('one'))?.gradeCode).toBe('V4')
    await repository.put(entry('one', { gradeCode: 'V5' }))
    expect((await repository.get('one'))?.gradeCode).toBe('V5')
    await repository.delete('one')
    expect(await repository.get('one')).toBeUndefined()
  })

  it('filters records and returns newest first', async () => {
    await repository.put(entry('old'))
    await repository.put(entry('new', { climbType: 'sport', gradeSystem: 'french', gradeCode: '6b', result: 'send', attemptCount: 3, climbedAt: '2026-07-17T10:00:00.000Z' }))
    expect((await repository.list()).map(({ id }) => id)).toEqual(['new', 'old'])
    expect((await repository.list({ climbType: 'sport', result: 'send' })).map(({ id }) => id)).toEqual(['new'])
    expect(await repository.list({ from: '2026-07-17T00:00:00.000Z' })).toHaveLength(1)
  })
})
