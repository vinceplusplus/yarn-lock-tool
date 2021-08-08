import * as lockfile from '@yarnpkg/lockfile'
import fs from 'fs'
import inquirer from 'inquirer'
import * as semver from 'semver'

import {
  buildDeduplicatables,
  buildResolutionsFromLockFileObject,
  extractFromVersionedPackageName,
  load,
} from '../library'
import type { PackageResolutions, Resolutions } from '../types/types'
import { assertNonNullish } from '../utils/assertion'
import type { DedupeJustParamsContainer } from './types'

export const buildPackageNameFilter = (
  deduplicatables: Resolutions,
): ((_: unknown, input: string | null | undefined) => string[]) => {
  return (...[, input]) => {
    return Object.keys(deduplicatables).filter((key) => key.includes(input ?? ''))
  }
}

export const buildVersionedPackageNameFilter = (
  packageResolutions: PackageResolutions,
): ((_: unknown, input: string | null | undefined) => string[]) => {
  return (...[, input]) => {
    return Object.keys(packageResolutions).filter((key) => key.includes(input ?? ''))
  }
}

export const buildVersionFilter = (
  eligibleVersions: string[],
): ((_: unknown, input: string | null | undefined) => string[]) => {
  return (...[, input]) => {
    return eligibleVersions.filter((key) => key.includes(input ?? ''))
  }
}

export const dedupeJust = async (paramsContainer: DedupeJustParamsContainer) => {
  const { params } = paramsContainer
  const { yarnLockJSON, firstLevelDependencies } = load('.')
  const resolutions = buildResolutionsFromLockFileObject(firstLevelDependencies)
  const { deduplicatables: deduplicatables, packagesVersions } = buildDeduplicatables(resolutions)

  const { versionedPackageName, newVersion } = await (async () => {
    const { packageName, versionedPackageName, newVersion } = await (async () => {
      const { dependency: inputDependency, newVersion: inputNewVersion } = params
      const dependency = inputDependency ?? ''
      const newVersion = inputNewVersion ?? ''
      const { packageName, versionRange } = extractFromVersionedPackageName(dependency)
      return {
        packageName,
        versionedPackageName: versionRange ? `${packageName}@${versionRange}` : '',
        newVersion,
      }
    })()

    const selectedPackageName = await (async () => {
      if (packageName) {
        if (deduplicatables[packageName] == null) {
          throw new Error(
            `can't deduplicate ${packageName}. either package not found or no other version(s) to deduplicate to`,
          )
        }
        return packageName
      }
      const answer: { packageName: string } = await inquirer.prompt([
        {
          type: 'autocomplete',
          name: 'packageName',
          message: 'Select a package name',
          source: buildPackageNameFilter(deduplicatables),
        },
      ])
      return answer.packageName
    })()

    const selectedVersionedPackageName = await (async () => {
      if (versionedPackageName) {
        if (deduplicatables[selectedPackageName]?.[versionedPackageName] == null) {
          throw new Error(
            `can't deduplicate ${versionedPackageName}. either no such dependency or no other version(s) to deduplicate to`,
          )
        }
        return versionedPackageName
      }
      const packageResolutions = deduplicatables[selectedPackageName]
      assertNonNullish(packageResolutions)

      const answer: { versionedPackageName: string } = await inquirer.prompt([
        {
          type: 'autocomplete',
          name: 'versionedPackageName',
          message: 'Select a versioned package name',
          source: buildVersionedPackageNameFilter(packageResolutions),
        },
      ])
      return answer.versionedPackageName
    })()

    const selectedNewVersion = await (async () => {
      const versions = packagesVersions[selectedPackageName]
      assertNonNullish(versions)

      const { semVerRange } = extractFromVersionedPackageName(selectedVersionedPackageName)
      assertNonNullish(semVerRange)

      if (newVersion) {
        if (!versions.includes(newVersion)) {
          throw new Error(`no such version, ${newVersion}`)
        }
        if (!semver.satisfies(newVersion, semVerRange)) {
          throw new Error(
            `new version \`${newVersion}\` doesn't satisfy \`${versionedPackageName}\``,
          )
        }
        return newVersion
      } else {
        const eligibleVersions = versions.filter((version) =>
          semver.satisfies(version, semVerRange),
        )
        const answer: { version: string } = await inquirer.prompt([
          {
            type: 'autocomplete',
            name: 'version',
            message: 'Select a version',
            source: buildVersionFilter(eligibleVersions),
          },
        ])
        return answer.version
      }
    })()
    return {
      versionedPackageName: selectedVersionedPackageName,
      newVersion: selectedNewVersion,
    }
  })()

  const { packageName } = extractFromVersionedPackageName(versionedPackageName)
  const firstLevelDependency = Object.values(resolutions[packageName] ?? {}).filter(
    (firstLevelDependency) => firstLevelDependency.version === newVersion,
  )[0]
  assertNonNullish(firstLevelDependency)
  firstLevelDependencies[versionedPackageName] = firstLevelDependency
  console.log("Don't forget to run `yarn` to clean up any possible ghost entries in `yarn.lock`")

  fs.writeFileSync('yarn.lock', lockfile.stringify(yarnLockJSON.object))
}
