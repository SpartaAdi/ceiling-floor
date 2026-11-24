import type { AppData } from '../types'
import { normalize } from '../services/storageService'
import { mergeData, sameSynced } from './merge'

/** Minimal contract a cloud backend must provide. */
export interface RemoteStore {
  pull(): Promise<unknown | null>
  push(data: AppData): Promise<void>
}

export interface SyncResult {
  merged: AppData
  /** Local data must be updated with `merged` */
  changedLocal: boolean
  /** Remote was updated */
  pushed: boolean
}

/** One sync round: pull → merge → push only if the cloud copy is behind. */
export async function syncOnce(local: AppData, remote: RemoteStore): Promise<SyncResult> {
  const raw = await remote.pull()
  const theirs = raw ? normalize(raw) : null
  const merged = theirs ? mergeData(local, theirs) : local
  const changedLocal = !sameSynced(merged, local)
  let pushed = false
  if (!theirs || !sameSynced(merged, theirs)) {
    await remote.push(merged)
    pushed = true
  }
  return { merged, changedLocal, pushed }
}
