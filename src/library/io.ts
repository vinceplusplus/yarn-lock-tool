import type { LockFileObject } from '@yarnpkg/lockfile'
import * as lockfile from '@yarnpkg/lockfile'
import fs from 'fs'
import path from 'path'

import type {
  PackageJSON,
  YarnLockFirstLevelDependencies,
  YarnLockFirstLevelDependency,
} from '../types/types'
import { lazily } from '../utils/lazilyGet'
import { extractFromVersionedPackageName } from './analysis'

export type WorkingContext = {
  dirPath: string
  yarnLockJSON: ReturnType<typeof lockfile.parse>
  firstLevelDependencies: YarnLockFirstLevelDependencies
  packageJSON: PackageJSON
}

const checkSameResolvedVersions = (workingContext: WorkingContext) => {
  let isValid = true

  const dependencies: {
    [packageName: string]: {
      [version: string]: {
        versionedPackageName: string
        firstLevelDependency: YarnLockFirstLevelDependency
      }
    }
  } = {}

  for (const [versionedPackageName, firstLevelDependency] of Object.entries(
    workingContext.firstLevelDependencies,
  )) {
    const { packageName } = extractFromVersionedPackageName(versionedPackageName)
    const existingVersionContainer = lazily(dependencies)
      .get(packageName, () => ({}))
      .get(firstLevelDependency.version, () => ({
        versionedPackageName,
        firstLevelDependency,
      }))
      .getCurrentContainer()
    if (firstLevelDependency !== existingVersionContainer.firstLevelDependency) {
      console.log(`error: Same resolved version (${firstLevelDependency.version}) found`)
      console.log(`first seen: ${existingVersionContainer.versionedPackageName}`)
      console.log(`now: ${versionedPackageName}`)
      isValid = false
    }
  }
  return isValid
}

const performSanityChecks = (workingContext: WorkingContext) => {
  const isValid = [checkSameResolvedVersions(workingContext)].reduce(
    (running, item) => running && item,
  )
  if (!isValid) {
    throw new Error('one or more errors when performing sanity checks')
  }
}

export const load = (dirPath: string): WorkingContext => {
  const yarnLock = fs.readFileSync(path.join(dirPath, 'yarn.lock'), 'utf-8')
  const yarnLockJSON = lockfile.parse(yarnLock)

  if (yarnLockJSON.type !== 'success') {
    throw new Error(`failed to parse \`yarn.lock\`, type: ${yarnLockJSON.type}`)
  }

  if (yarnLockJSON.object == null) {
    throw new Error('failed to parse `yarn.lock`, null `object`')
  }

  const packageJSON = JSON.parse(
    fs.readFileSync(path.join(dirPath, 'package.json'), 'utf-8'),
  ) as PackageJSON

  const firstLevelDependencies: YarnLockFirstLevelDependencies =
    yarnLockJSON.object as LockFileObject

  const workingContext: WorkingContext = {
    dirPath,
    yarnLockJSON,
    firstLevelDependencies,
    packageJSON,
  }

  performSanityChecks(workingContext)

  return workingContext
}

export const save = (workingContext: WorkingContext) => {
  fs.writeFileSync(
    path.join(workingContext.dirPath, 'yarn.lock'),
    lockfile.stringify(workingContext.yarnLockJSON.object),
  )
}
