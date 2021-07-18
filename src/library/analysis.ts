import * as semver from 'semver'
import { URL } from 'url'

import type {
  Dependencies,
  DependencyPath,
  DependencyPaths,
  DependencyPathsMap,
  Resolutions,
  VersionedPackageName,
  VersionedPackages,
  VersionGroupedDependencyPathsMap,
  YarnLockFirstLevelDependencies,
} from '../types/types'
import { lazily } from '../utils/lazilyGet'

export const getDependencies = (
  container: {
    dependencies?: Dependencies
    optionalDependencies?: Dependencies
  },
  firstLevelDependencies: YarnLockFirstLevelDependencies,
): Dependencies => {
  // only add resolvable optional dependencies
  const resolvableOptionalDependencies = Object.fromEntries(
    Object.entries(container.optionalDependencies ?? {}).filter(
      ([packageName, versionRange]) =>
        firstLevelDependencies[`${packageName}@${versionRange}`] != null,
    ),
  )
  return {
    ...container.dependencies,
    ...resolvableOptionalDependencies,
  }
}

export const extractFromVersionedPackageName = (versionedPackageName: string) => {
  // name can be optionally prefixed by a scope, https://docs.npmjs.com/cli/v7/configuring-npm/package-json#name
  const [packageName = '', versionRange = ''] = versionedPackageName.split(/(?<!^)@/)
  const semVerRange = (() => {
    const url = (() => {
      try {
        return new URL(versionRange)
      } catch {
        return null
      }
    })()
    if (url != null) {
      // https://docs.npmjs.com/cli/v7/configuring-npm/package-json#git-urls-as-dependencies
      switch (url.protocol) {
        case 'git':
        case 'git+ssh':
        case 'git+http':
        case 'git+https':
        case 'git+file': {
          const commitish = url.hash.substring(1)
          const semVerRange = commitish.replace(/^semver:/, '')
          return semver.validRange(semVerRange)
        }
        default:
          return null
      }
    } else {
      // NOTE: as of this writing, validRange() could return null but doesn't annotate so
      const semVerRange: string | null = semver.validRange(versionRange)
      return semVerRange
    }
  })()
  return {
    packageName,
    versionRange,
    semVerRange,
  }
}

export const buildResolutionsFromLockFileObject = (
  firstLevelDependencies: YarnLockFirstLevelDependencies,
): Resolutions => {
  const container: Resolutions = {}
  for (const [versionedPackageName, firstLevelDependency] of Object.entries(
    firstLevelDependencies,
  )) {
    const { packageName } = extractFromVersionedPackageName(versionedPackageName)
    lazily(container)
      .get(packageName, () => ({}))
      .set(versionedPackageName, firstLevelDependency)
  }

  return container
}

export const buildResolutionsFromDependencies = (
  dependencies: Dependencies,
  firstLevelDependencies: YarnLockFirstLevelDependencies,
  depthLimit: number | null,
): Resolutions => {
  const container: Resolutions = {}
  const build = (dependencies: Dependencies, depth: number) => {
    if (depthLimit != null && depth >= depthLimit) {
      return
    }

    for (const [packageName, versionRange] of Object.entries(dependencies)) {
      const versionedPackageName = `${packageName}@${versionRange}`
      const resolvedDependency = firstLevelDependencies[versionedPackageName]
      if (resolvedDependency == null) {
        throw new Error('should not reach here')
      }

      const packageResolutions = lazily(container)
        .get(packageName, () => ({}))
        .getCurrentContainer()
      if (packageResolutions[versionedPackageName] != null) {
        // NOTE: circular dependency or visited path
        continue
      }
      packageResolutions[versionedPackageName] = resolvedDependency
      build(getDependencies(resolvedDependency, firstLevelDependencies), depth + 1)
    }
  }
  build(dependencies, 0)
  return container
}

export const buildReachableDependencies = (
  dependencies: Dependencies,
  firstLevelDependencies: YarnLockFirstLevelDependencies,
): VersionedPackages => {
  const container: VersionedPackages = {}
  const resolutions = buildResolutionsFromDependencies(dependencies, firstLevelDependencies, null)
  for (const packageResolutions of Object.values(resolutions)) {
    for (const [versionedPackageName, firstLevelDependency] of Object.entries(packageResolutions)) {
      container[versionedPackageName] = firstLevelDependency
    }
  }
  return container
}

export const buildOrphanedDependencies = (
  directDependencies: Dependencies,
  firstLevelDependencies: YarnLockFirstLevelDependencies,
): VersionedPackages => {
  const container: VersionedPackages = {}
  const reachableDependencies = buildReachableDependencies(
    directDependencies,
    firstLevelDependencies,
  )
  for (const [versionedPackageName, firstLevelDependency] of Object.entries(
    firstLevelDependencies,
  )) {
    if (reachableDependencies[versionedPackageName] == null) {
      container[versionedPackageName] = firstLevelDependency
    }
  }

  return container
}

export const buildDependencyPaths = (
  startingDependency: VersionedPackageName,
  firstLevelDependencies: YarnLockFirstLevelDependencies,
): DependencyPaths => {
  const build = (versionedPackageName: string, parentDependencyPath: DependencyPath) => {
    if (parentDependencyPath.indexOf(versionedPackageName) !== -1) {
      // NOTE: circular dependency
      return []
    }
    const resolvedDependency = firstLevelDependencies[versionedPackageName]
    if (resolvedDependency == null) {
      throw new Error('should not reach here')
    }
    const dependencyPath = [...parentDependencyPath, versionedPackageName]

    let container: DependencyPaths = [dependencyPath]
    const childDependencies = getDependencies(resolvedDependency, firstLevelDependencies)
    for (const childDependency of Object.entries(childDependencies)) {
      const [childVersionedPackageName, childVersionRange] = childDependency
      /**
       * NOTE: can't use container.push(...items) as large no. of items will cause Maximum call
       *       stack size exceeded,
       *       https://stackoverflow.com/questions/61740599/rangeerror-maximum-call-stack-size-exceeded-with-array-push
       */
      container = [
        ...container,
        ...build(`${childVersionedPackageName}@${childVersionRange}`, dependencyPath),
      ]
    }
    return container
  }
  return build(startingDependency, [])
}

export const buildDependencyPathsMap = (
  startingDependencies: VersionedPackageName[],
  firstLevelDependencies: YarnLockFirstLevelDependencies,
): DependencyPathsMap => {
  const container: DependencyPathsMap = {}
  for (const versionedPackageName of startingDependencies) {
    const dependencyPaths = buildDependencyPaths(versionedPackageName, firstLevelDependencies)
    for (const dependencyPath of dependencyPaths) {
      const tailingDependency = dependencyPath[dependencyPath.length - 1]
      if (tailingDependency == null) {
        throw new Error('should not reach here')
      }

      lazily(container)
        .get(tailingDependency, () => [])
        .getCurrentContainer()
        .push(dependencyPath)
    }
  }
  return container
}

export const buildVersionGroupedDependencyPathsMap = (
  startingDependencies: VersionedPackageName[],
  firstLevelDependencies: YarnLockFirstLevelDependencies,
): VersionGroupedDependencyPathsMap => {
  const container: VersionGroupedDependencyPathsMap = {}
  const dependencyPathsMap = buildDependencyPathsMap(startingDependencies, firstLevelDependencies)

  for (const [versionedPackageName, dependencyPaths] of Object.entries(dependencyPathsMap)) {
    const { packageName } = extractFromVersionedPackageName(versionedPackageName)
    const firstLevelDependency = firstLevelDependencies[versionedPackageName]
    if (firstLevelDependency == null) {
      throw new Error('should not reach here')
    }
    const { version } = firstLevelDependency
    lazily(container)
      .get(packageName, () => ({}))
      .get(version, () => ({}))
      .set(versionedPackageName, dependencyPaths)
  }

  return container
}
