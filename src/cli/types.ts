import type { DedupeResolutionsType, ListWithDependencyPathsSourcesType } from '../types/types'

export type DedupeParams = {
  resolutions: DedupeResolutionsType
  skirmishes: boolean
}

export type DedupeJustParams = {
  dependency: string | null
}

export type ListParams = {
  depth: number | null
  maxArrayLength: number | null
  showsHavingMultipleVersionsOnly: boolean
  sortsByResolvedVersionCount: boolean
  showsAsJSON: boolean
}

export type ListWithDependencyPathsParams = {
  depth: number | null
  maxArrayLength: number | null
  sources: ListWithDependencyPathsSourcesType
  filtersBySources: boolean
  sortsByDepth: boolean
  showsDuplicatedOnly: boolean
  showsAsJSON: boolean
}

export type DedupeParamsContainer = {
  type: 'dedupe'
  params: DedupeParams
}

export type DedupeJustParamsContainer = {
  type: 'dedupeJust'
  params: DedupeJustParams
}

export type ListParamsContainer = {
  type: 'list'
  params: ListParams
}

export type ListWithDependencyPathsParamsContainer = {
  type: 'listWithDependencyPaths'
  params: ListWithDependencyPathsParams
}

export type ParamsContainer =
  | DedupeParamsContainer
  | DedupeJustParamsContainer
  | ListParamsContainer
  | ListWithDependencyPathsParamsContainer
