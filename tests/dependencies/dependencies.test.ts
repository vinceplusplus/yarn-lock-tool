import { buildResolutionsFromLockFileObject, deduplicate, load } from '../../src'

it('there should be no dependencies to deduplicate', () => {
  const workingContext = load('.')
  const resolutions = buildResolutionsFromLockFileObject(workingContext.firstLevelDependencies)

  let deduplicated: string[] = []
  let removedUnreachables: string[] = []
  deduplicate(workingContext, resolutions, {
    onDeduplicated: (versionedPackageName) => {
      deduplicated = [...deduplicated, versionedPackageName]
    },
    onRemovedUnreachable: (versionedPackageName) => {
      removedUnreachables = [...removedUnreachables, versionedPackageName]
    },
  })

  expect(deduplicated).toEqual([])
  expect(removedUnreachables).toEqual([])
})
