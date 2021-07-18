import * as semver from 'semver'

import type {
  DedupeResolutionsType,
  Resolutions,
  VersionedPackages,
  YarnLockFirstLevelDependency,
} from '../types/types'
import {
  buildOrphanedDependencies,
  buildReachableDependencies,
  buildResolutionsFromDependencies,
  buildResolutionsFromLockFileObject,
  extractFromVersionedPackageName,
  getDependencies,
} from './analysis'
import { load, save, WorkingContext } from './io'

export type DeduplicateDelegate = {
  onFindOrphans?: (orphanedDependencies: VersionedPackages) => void
  onDeduplicate?: (
    versionedPackageName: string,
    originalDependency: YarnLockFirstLevelDependency,
    targetDependency: YarnLockFirstLevelDependency,
  ) => void
  onRemoveUnreachable?: (
    versionedPackageName: string,
    dependency: YarnLockFirstLevelDependency,
  ) => void
}

export const deduplicate = (
  workingContext: WorkingContext,
  resolutions: Resolutions,
  delegate?: DeduplicateDelegate,
) => {
  const { firstLevelDependencies, packageJSON } = workingContext

  // NOTE: orphans might be here because of `resolutions` from package.json, so will preserve them
  const orphanedDependencies = buildOrphanedDependencies(
    {
      ...getDependencies(packageJSON, firstLevelDependencies),
      ...packageJSON.devDependencies,
    },
    firstLevelDependencies,
  )
  delegate?.onFindOrphans?.(orphanedDependencies)

  for (const versionedPackageName of Object.keys(firstLevelDependencies)) {
    const { packageName, semVerRange } = extractFromVersionedPackageName(versionedPackageName)

    // NOTE: skip when not a valid version range or a clean semver
    if (semVerRange == null || semver.clean(semVerRange) != null) {
      continue
    }

    const possibleResolutions = resolutions[packageName]
    // NOTE: skip when resolutions not found
    if (possibleResolutions == null) {
      continue
    }

    const deduplicatedFirstLevelDependency = (() => {
      let highestResolution: YarnLockFirstLevelDependency | null = null
      for (const firstLevelDependency of Object.values(possibleResolutions)) {
        if (semver.satisfies(firstLevelDependency.version, semVerRange)) {
          if (
            highestResolution == null ||
            semver.gt(firstLevelDependency.version, highestResolution.version)
          ) {
            highestResolution = firstLevelDependency
          }
        }
      }
      return highestResolution
    })()

    if (
      deduplicatedFirstLevelDependency == null ||
      firstLevelDependencies[versionedPackageName] === deduplicatedFirstLevelDependency
    ) {
      continue
    }

    const originalFirstLevelDependency = firstLevelDependencies[versionedPackageName]
    if (originalFirstLevelDependency == null) {
      throw new Error('should not reach here')
    }
    firstLevelDependencies[versionedPackageName] = deduplicatedFirstLevelDependency

    delegate?.onDeduplicate?.(
      versionedPackageName,
      originalFirstLevelDependency,
      deduplicatedFirstLevelDependency,
    )
  }

  // NOTE: build a map for reachable dependencies
  const reachableDependencies = buildReachableDependencies(
    {
      ...getDependencies(packageJSON, firstLevelDependencies),
      ...packageJSON.devDependencies,
    },
    firstLevelDependencies,
  )

  // NOTE: get rid of any unreachable
  for (const versionedPackageName of Object.keys(firstLevelDependencies)) {
    if (
      reachableDependencies[versionedPackageName] == null &&
      orphanedDependencies[versionedPackageName] == null
    ) {
      const firstLevelDependency = firstLevelDependencies[versionedPackageName]
      if (firstLevelDependency == null) {
        throw new Error('should not reach here')
      }

      delete firstLevelDependencies[versionedPackageName]

      delegate?.onRemoveUnreachable?.(versionedPackageName, firstLevelDependency)
    }
  }
}

export type DeduplicateOnDirectoryParams = {
  dirPath?: string
  resolutions: DedupeResolutionsType
  printsLog?: boolean
  skirmishes?: boolean
}

export const deduplicateOnDirectory = (params: DeduplicateOnDirectoryParams) => {
  const printsLog = params.printsLog === true

  const workingContext = load(params.dirPath ?? '.')
  const { firstLevelDependencies, packageJSON } = workingContext

  const resolutions: Resolutions = (() => {
    switch (params.resolutions) {
      case 'all':
        return buildResolutionsFromLockFileObject(firstLevelDependencies)
      case 'dependencies':
        return buildResolutionsFromDependencies(
          getDependencies(packageJSON, firstLevelDependencies),
          firstLevelDependencies,
          1,
        )
      case 'devDependencies':
        return buildResolutionsFromDependencies(
          packageJSON.devDependencies ?? {},
          firstLevelDependencies,
          1,
        )
      case 'dependenciesAndDevDependencies':
        return buildResolutionsFromDependencies(
          {
            ...getDependencies(packageJSON, firstLevelDependencies),
            ...packageJSON.devDependencies,
          },
          firstLevelDependencies,
          1,
        )
    }
  })()

  let updatedDependencyCount = 0
  let unreachableRemovalCount = 0

  deduplicate(workingContext, resolutions, {
    onFindOrphans: (orphanedDependencies) => {
      if (Object.entries(orphanedDependencies).length > 0) {
        if (printsLog) {
          // NOTE: could be from `resolutions` in `package.json` or incomplete yarn.lock after deduplicate without running `yarn`
          console.log(
            `${Object.keys(orphanedDependencies).length} existing orphan(s) to preserved:`,
          )
          console.log(
            Object.entries(orphanedDependencies).map(([packageName, firstLevelDependency]) => [
              packageName,
              firstLevelDependency.version,
            ]),
            { maxArrayLength: null },
          )
        }
      }
    },
    onDeduplicate: (versionedPackageName, originalDependency, targetDependency) => {
      if (printsLog) {
        console.log(
          `${versionedPackageName}, ${originalDependency.version} -> ${targetDependency.version}`,
        )
      }
      updatedDependencyCount += 1
    },
    onRemoveUnreachable: (versionedPackageName, dependency) => {
      if (printsLog) {
        console.log(`- ${versionedPackageName}, ${dependency.version}`)
      }
      unreachableRemovalCount += 1
    },
  })

  if (printsLog) {
    console.log('\n')
    console.log(`Updated ${updatedDependencyCount} dependency resolution(s)`)
    console.log(`Removed ${unreachableRemovalCount} dependency resolution(s)`)
  }

  if (!params.skirmishes) {
    save(workingContext)
  }
}
