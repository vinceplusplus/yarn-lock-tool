import type { FirstLevelDependency } from '@yarnpkg/lockfile'

export type ValidStrings<StringLiteralType extends string> = {
  [key in StringLiteralType]: key
}

export type DedupeResolutionsType =
  | 'all'
  | 'dependencies'
  | 'devDependencies'
  | 'dependenciesAndDevDependencies'

export const validDedupeResolutionsTypes: ValidStrings<DedupeResolutionsType> = {
  all: 'all',
  dependencies: 'dependencies',
  devDependencies: 'devDependencies',
  dependenciesAndDevDependencies: 'dependenciesAndDevDependencies',
}

export type ListWithDependencyPathsSourcesType =
  | 'dependencies'
  | 'devDependencies'
  | 'dependenciesAndDevDependencies'

export const validListWithDependencyPathsFromTypes: ValidStrings<ListWithDependencyPathsSourcesType> =
  {
    dependencies: 'dependencies',
    devDependencies: 'devDependencies',
    dependenciesAndDevDependencies: 'dependenciesAndDevDependencies',
  }

export type DependencyVersionRange = string
export type Dependencies = {
  [packageName: string]: DependencyVersionRange
}

export type PackageJSON = {
  dependencies?: Dependencies
  optionalDependencies?: Dependencies
  devDependencies?: Dependencies
}

export type YarnLockFirstLevelDependency = {
  version: string
  resolved?: string
  dependencies?: Dependencies
  optionalDependencies?: Dependencies
}

export type YarnLockFirstLevelDependencies = {
  [versionedPackageName: string]: YarnLockFirstLevelDependency
}

// NOTE: package name @ version range, abc@^x.y.z
export type VersionedPackageName = string

export type PackageResolutions = {
  [versionedPackageName: string]: FirstLevelDependency
}

export type Resolutions = {
  [packageName: string]: PackageResolutions
}

export type VersionedPackages = {
  [versionedPackageName: string]: FirstLevelDependency
}

export type DependencyPath = VersionedPackageName[]
export type DependencyPaths = DependencyPath[]

// NOTE: for each entry, the possible dependency paths leading to the dependency specified by the key
export type DependencyPathsMap = {
  [versionedPackageName: string]: DependencyPaths
}

export type VersionGroupedDependencyPathsMap = {
  [packageName: string]: {
    [version: string]: DependencyPathsMap
  }
}
