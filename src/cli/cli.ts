import * as lockfile from '@yarnpkg/lockfile'
import fs from 'fs'
import inquirer from 'inquirer'
import inquirerAutocompletePrompt from 'inquirer-autocomplete-prompt'
import * as semver from 'semver'
import { hideBin } from 'yargs/helpers'

import {
  buildResolutionsFromLockFileObject,
  buildVersionGroupedDependencyPathsMap,
  deduplicateOnDirectory,
  extractFromVersionedPackageName,
  getDependencies,
  load,
} from '../library'
import type { Dependencies, PackageResolutions } from '../types/types'
import { objectHOF } from '../utils/objectHOF'
import { parseCLIParams } from './parseCLIParams'

export const main = async () => {
  inquirer.registerPrompt('autocomplete', inquirerAutocompletePrompt)

  const paramsContainer = parseCLIParams(hideBin(process.argv))
  if (paramsContainer == null) {
    return
  }
  switch (paramsContainer.type) {
    case 'dedupe':
      {
        const { params } = paramsContainer
        deduplicateOnDirectory({
          dirPath: '.',
          resolutions: params.resolutions,
          printsLog: true,
          skirmishes: params.skirmishes,
        })
        console.log('\n')
        console.log("Don't forget to run `yarn` to clean up the ghost entries in `yarn.lock`")
      }
      break
    case 'dedupeJust':
      {
        const { params } = paramsContainer
        const { yarnLockJSON, firstLevelDependencies } = load('.')
        const resolutions = buildResolutionsFromLockFileObject(firstLevelDependencies)
        const { dependency } = params

        const { versionedPackageName, newVersion } = await (async () => {
          const { packageName, versionedPackageName, newVersion } = await (async () => {
            const parts = dependency?.split('=>') ?? []
            const { packageName, versionedPackageName } = (() => {
              const versionedPackageName = parts[0] ?? ''
              try {
                const { packageName } = extractFromVersionedPackageName(versionedPackageName)
                return {
                  packageName,
                  versionedPackageName,
                }
              } catch {
                return {
                  packageName: versionedPackageName,
                  versionedPackageName: null,
                }
              }
            })()
            return {
              packageName,
              versionedPackageName,
              newVersion: parts[1] ?? '',
            }
          })()

          const selectedPackageName = await (async () => {
            if (packageName) {
              if (resolutions[packageName] == null) {
                throw new Error(`Invalid package name: ${packageName}`)
              }
              return packageName
            }
            const answer: { packageName: string } = await inquirer.prompt([
              {
                type: 'autocomplete',
                name: 'packageName',
                message: 'Select a package name',
                source: (answersSoFar: string[], input: string | null | undefined) => {
                  return Object.keys(resolutions).filter((key) => key.includes(input ?? ''))
                },
              },
            ])
            return answer.packageName
          })()

          const selectedVersionedPackageName = await (async () => {
            if (versionedPackageName) {
              if (resolutions[selectedPackageName]?.[versionedPackageName] != null) {
                throw new Error(`Invalid versioned package name: ${versionedPackageName}`)
              }
              return versionedPackageName
            }
            const packageResolutions = resolutions[selectedPackageName]
            if (packageResolutions == null) {
              throw new Error(`No package resolution for package name: ${packageName}`)
            }
            const answer: { versionedPackageName: string } = await inquirer.prompt([
              {
                type: 'autocomplete',
                name: 'versionedPackageName',
                message: 'Select a versioned package name',
                source: (answersSoFar: string[], input: string | null | undefined) => {
                  return Object.keys(packageResolutions).filter((key) => key.includes(input ?? ''))
                },
              },
            ])
            return answer.versionedPackageName
          })()

          const selectedNewVersion = await (async () => {
            const versions = (() => {
              const versions: { [version: string]: true } = {}
              for (const firstLevelResolution of Object.values(
                resolutions[selectedPackageName] ?? {},
              )) {
                versions[firstLevelResolution.version] = true
              }
              return Object.keys(versions).sort(semver.compare)
            })()

            const { semVerRange } = extractFromVersionedPackageName(selectedVersionedPackageName)
            if (semVerRange == null || semver.clean(semVerRange) != null) {
              throw new Error(`Cannot adjust version: ${versionedPackageName}`)
            }

            if (newVersion) {
              if (!versions.includes(newVersion)) {
                throw new Error(`Invalid new version: ${newVersion}`)
              }
              if (!semver.satisfies(newVersion, semVerRange)) {
                throw new Error(
                  `New version \`${newVersion}\` doesn't satisfy \`${versionedPackageName}\``,
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
                  source: (answersSoFar: string[], input: string | null | undefined) => {
                    return eligibleVersions.filter((key) => key.includes(input ?? ''))
                  },
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
        if (firstLevelDependency == null) {
          throw new Error(`should not reach here`)
        }
        firstLevelDependencies[versionedPackageName] = firstLevelDependency
        console.log(
          "Don't forget to run `yarn` to clean up any possible ghost entries in `yarn.lock`",
        )

        fs.writeFileSync('yarn.lock', lockfile.stringify(yarnLockJSON.object))
      }
      break
    case 'list':
      {
        const { params } = paramsContainer
        const { firstLevelDependencies } = load('.')

        const getResolvedVersionCount = (packageResolutions: PackageResolutions): number => {
          const versions: { [version: string]: true } = {}
          for (const packageResolution of Object.values(packageResolutions)) {
            versions[packageResolution.version] = true
          }
          return Object.values(versions).length
        }

        const resolutions = buildResolutionsFromLockFileObject(firstLevelDependencies)
        const formattedObject = objectHOF(resolutions, { clones: true })
          .substitute((sub) => {
            if (params.showsHavingMultipleVersionsOnly) {
              return sub.filter(
                (_packageName, packageResolutions) =>
                  getResolvedVersionCount(packageResolutions) > 1,
              )
            } else {
              return sub
            }
          })
          .substitute((sub) => {
            if (params.sortsByResolvedVersionCount) {
              return sub.sort((a, b) => {
                return getResolvedVersionCount(b[1]) - getResolvedVersionCount(a[1])
              })
            } else {
              return sub
            }
          })
          .getObject()
        if (params.showsAsJSON) {
          console.log(JSON.stringify(formattedObject, null, 2))
        } else {
          console.dir(formattedObject, {
            maxArrayLength: params.maxArrayLength,
            depth: params.depth,
            compact: false,
          })
        }
      }
      break
    case 'listWithDependencyPaths':
      {
        const { params } = paramsContainer
        const { firstLevelDependencies, packageJSON } = load('.')
        const directDependencies: Dependencies = (() => {
          switch (params.sources) {
            case 'dependencies':
              return getDependencies(packageJSON, firstLevelDependencies)
            case 'devDependencies':
              return packageJSON.devDependencies ?? {}
            case 'dependenciesAndDevDependencies':
              return {
                ...getDependencies(packageJSON, firstLevelDependencies),
                ...packageJSON.devDependencies,
              }
          }
        })()
        const directDependencyVersionedPackageNames = Object.entries(directDependencies).map(
          ([packageName, versionRange]) => `${packageName}@${versionRange}`,
        )
        const versionGroupedDependencyPathsMap = buildVersionGroupedDependencyPathsMap(
          directDependencyVersionedPackageNames,
          firstLevelDependencies,
        )
        const formattedObject = objectHOF(versionGroupedDependencyPathsMap, { clones: true })
          .substitute((sub) => {
            return sub
              .sort()
              .substitute((packages) => {
                if (params.filtersBySources) {
                  return packages.filter((packageName) => packageName in directDependencies)
                } else {
                  return packages
                }
              })
              .substitute((packages) => {
                if (params.showsDuplicatedOnly) {
                  return packages.filter((_, versions) => Object.keys(versions).length > 1)
                } else {
                  return packages
                }
              })
              .traverse()
              .sort((a, b) => semver.compare(a[0], b[0]))
          })
          .substitute((sub) => {
            if (params.sortsByDepth) {
              return sub.sort((a, b) => {
                let maxDepth1 = 0
                for (const map of Object.values(a[1])) {
                  for (const paths of Object.values(map)) {
                    for (const path of paths) {
                      maxDepth1 = Math.max(path.length, maxDepth1)
                    }
                  }
                }
                let maxDepth2 = 0
                for (const map of Object.values(b[1])) {
                  for (const paths of Object.values(map)) {
                    for (const path of paths) {
                      maxDepth2 = Math.max(path.length, maxDepth2)
                    }
                  }
                }
                return maxDepth1 - maxDepth2
              })
            } else {
              return sub
            }
          })
          .getObject()
        if (params.showsAsJSON) {
          console.log(JSON.stringify(formattedObject, null, 2))
        } else {
          console.dir(formattedObject, {
            maxArrayLength: params.maxArrayLength,
            depth: params.depth,
            compact: false,
          })
        }
      }
      break
  }
}
