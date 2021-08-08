import { buildResolutionsFromLockFileObject, load } from '../library'
import type { PackageResolutions } from '../types/types'
import { makeObjectHOF } from '../utils/objectHOF'
import type { ListParamsContainer } from './types'

export const list = async (paramsContainer: ListParamsContainer) => {
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
  const formattedObject = makeObjectHOF(resolutions, { clones: true })
    .substitute((sub) => {
      if (params.showsHavingMultipleVersionsOnly) {
        return sub.filter(
          (_packageName, packageResolutions) => getResolvedVersionCount(packageResolutions) > 1,
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
