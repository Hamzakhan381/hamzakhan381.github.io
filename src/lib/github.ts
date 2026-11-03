import { useEffect, useState } from 'react'
import { profile } from '../content'
import { MS_PER_SECOND } from './math'

export type Repo = {
  id: number
  name: string
  html_url: string
  homepage: string | null
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  topics?: string[]
  fork: boolean
  archived: boolean
}

export type RepoState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; repos: Repo[] }

const SHOWN = 8
const PER_PAGE = 30
const SECONDS_PER_HOUR = 3600
const CACHE_TTL_MS = SECONDS_PER_HOUR * MS_PER_SECOND
const CACHE_KEY = `gh-repos:${profile.githubUser}`
const API = `https://api.github.com/users/${profile.githubUser}/repos?sort=updated&per_page=${PER_PAGE}`

function readCache(): Repo[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { at, repos } = JSON.parse(raw) as { at: number; repos: Repo[] }
    return Date.now() - at < CACHE_TTL_MS ? repos : null
  } catch {
    return null
  }
}

function writeCache(repos: Repo[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), repos }))
  } catch {
    /* storage unavailable (private mode); fetching again next visit is fine */
  }
}

async function fetchRepos(signal: AbortSignal): Promise<Repo[]> {
  const cached = readCache()
  if (cached) return cached
  const res = await fetch(API, { signal, headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
  const all = (await res.json()) as Repo[]
  const repos = all
    .filter((r) => !r.fork && !r.archived && r.name.toLowerCase() !== `${profile.githubUser.toLowerCase()}.github.io`)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, SHOWN)
  writeCache(repos)
  return repos
}

/** Loads public repos once `enabled` flips true, so the request waits until the section is near. */
export function useRepos(enabled: boolean): RepoState {
  const [state, setState] = useState<RepoState>({ status: 'loading' })

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const repos = await fetchRepos(controller.signal)
        setState({ status: 'ready', repos })
      } catch (err) {
        if (!controller.signal.aborted) setState({ status: 'error' })
        if (!controller.signal.aborted) console.warn('Could not load GitHub repos', err)
      }
    }
    load()
    return () => controller.abort()
  }, [enabled])

  return state
}

const WORD_SEPARATORS = ['-', '_']

export const formatRepoName = (name: string) =>
  WORD_SEPARATORS.reduce((text, sep) => text.split(sep).join(' '), name)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en', { month: 'short', year: 'numeric' })
