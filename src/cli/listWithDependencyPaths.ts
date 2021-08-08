import * as semver from 'semver'

import { buildVersionGroupedDependencyPathsMap, getDependencies, load } from '../library'
import type { Dependencies } from '../types/types'
import { makeObjectHOF } from '../utils/objectHOF'
import type { ListWithDependencyPathsParamsContainer } from './types'

export const listWithDependencyPaths = async (
  paramsContainer: ListWithDependencyPathsParamsContainer,
) => {
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
  const formattedObject = makeObjectHOF(versionGroupedDependencyPathsMap, { clones: true })
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
