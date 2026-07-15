import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ClimbResult, ClimbType, RouteEntry } from '../domain/models/climb'

interface ClimbLogSchema extends DBSchema {
  entries: {
    key: string
    value: RouteEntry
    indexes: { 'by-date': string; 'by-type': ClimbType; 'by-result': ClimbResult }
  }
}

export interface EntryFilter {
  climbType?: ClimbType
  result?: ClimbResult
  gradeCode?: string
  from?: string
  to?: string
}

export class RouteEntryRepository {
  private readonly db: IDBPDatabase<ClimbLogSchema>

  private constructor(db: IDBPDatabase<ClimbLogSchema>) {
    this.db = db
  }

  static async open(name = 'climblog'): Promise<RouteEntryRepository> {
    const db = await openDB<ClimbLogSchema>(name, 1, {
      upgrade(database) {
        const store = database.createObjectStore('entries', { keyPath: 'id' })
        store.createIndex('by-date', 'climbedAt')
        store.createIndex('by-type', 'climbType')
        store.createIndex('by-result', 'result')
      },
    })
    return new RouteEntryRepository(db)
  }

  put(entry: RouteEntry): Promise<string> { return this.db.put('entries', entry) }
  get(id: string): Promise<RouteEntry | undefined> { return this.db.get('entries', id) }
  delete(id: string): Promise<void> { return this.db.delete('entries', id) }
  clear(): Promise<void> { return this.db.clear('entries') }
  close(): void { this.db.close() }

  async list(filter: EntryFilter = {}): Promise<RouteEntry[]> {
    const entries = await this.db.getAll('entries')
    return entries.filter((entry) =>
      (!filter.climbType || entry.climbType === filter.climbType) &&
      (!filter.result || entry.result === filter.result) &&
      (!filter.gradeCode || entry.gradeCode === filter.gradeCode) &&
      (!filter.from || entry.climbedAt >= filter.from) &&
      (!filter.to || entry.climbedAt <= filter.to),
    ).sort((a, b) => b.climbedAt.localeCompare(a.climbedAt))
  }
}
