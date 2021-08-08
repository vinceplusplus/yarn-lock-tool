import { buildDeduplicatables, buildResolutionsFromLockFileObject, load } from '../../library'
import { assertNonNullish } from '../../utils/assertion'
import {
  buildPackageNameFilter,
  buildVersionedPackageNameFilter,
  buildVersionFilter,
} from '../dedupeJust'

describe('buildPackageNameFilter', () => {
  it('should work properly', () => {
    const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
    const resolutions = buildResolutionsFromLockFileObject(workingContext.firstLevelDependencies)
    const { deduplicatables } = buildDeduplicatables(resolutions)

    const filterPackageNames = buildPackageNameFilter(deduplicatables)

    expect(filterPackageNames(null, '')).toEqual(Object.keys(deduplicatables))
    expect(filterPackageNames(null, '@react-navigation')).toEqual([
      '@react-navigation/bottom-tabs',
      '@react-navigation/core',
      '@react-navigation/native',
      '@react-navigation/stack',
    ])
    expect(filterPackageNames(null, '@react-navigation/native')).toEqual([
      '@react-navigation/native',
    ])
    expect(filterPackageNames(null, 'non-existent-library')).toEqual([])
  })
})

describe('buildVersionedPackageNameFilter', () => {
  it('should work properly', () => {
    const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
    const resolutions = buildResolutionsFromLockFileObject(workingContext.firstLevelDependencies)
    const { deduplicatables } = buildDeduplicatables(resolutions)
    const packageResolutions = deduplicatables['@react-navigation/core']

    assertNonNullish(packageResolutions)

    const filterVersionPackageNames = buildVersionedPackageNameFilter(packageResolutions)

    expect(filterVersionPackageNames(null, '')).toEqual([
      '@react-navigation/core@^5.0.0',
      '@react-navigation/core@^5.12.4',
    ])
    expect(filterVersionPackageNames(null, '5.0.0')).toEqual(['@react-navigation/core@^5.0.0'])
    expect(filterVersionPackageNames(null, 'non-existent-dependency')).toEqual([])
  })
})

describe('buildVersionFilter', () => {
  it('should work properly', () => {
    const filterVersions = buildVersionFilter(['5.7.4', '5.9.6'])

    expect(filterVersions(null, '')).toEqual(['5.7.4', '5.9.6'])
    expect(filterVersions(null, '5.9.6')).toEqual(['5.9.6'])
    expect(filterVersions(null, 'non-existent-version')).toEqual([])
  })
})
