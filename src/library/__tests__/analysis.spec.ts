import * as fs from 'fs'

import {
  buildDeduplicatables,
  buildDependencyPaths,
  buildDependencyPathsMap,
  buildOrphanedDependencies,
  buildReachableDependencies,
  buildResolutionsFromDependencies,
  buildResolutionsFromLockFileObject,
  buildVersionGroupedDependencyPathsMap,
  extractFromVersionedPackageName,
  getDependencies,
} from '../analysis'
import { load } from '../io'

describe('analysis', () => {
  describe('getDependencies()', () => {
    it('should return dependencies properly', () => {
      const yarnLockJSON = {
        type: 'success',
        object: {
          'lodash@^4.17.21': {
            version: '4.17.21',
            resolved:
              'https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz#679591c564c3bffaae8454cf0b3df370c3d6911c',
            integrity:
              'sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==',
          },
          'lru-cache@^6.0.0': {
            version: '6.0.0',
            resolved:
              'https://registry.yarnpkg.com/lru-cache/-/lru-cache-6.0.0.tgz#6d6fe6570ebd96aaf90fcad1dafa3b2566db3a94',
            integrity:
              'sha512-Jo6dJ04CmSjuznwJSS3pUeWmd/H0ffTlkXXgwZi+eq1UCmqQwCh+eLsYOYCwY991i2Fah4h1BEMCx4qThGbsiA==',
            dependencies: {
              yallist: '^4.0.0',
            },
          },
          'semver@^7.3.5': {
            version: '7.3.5',
            resolved:
              'https://registry.yarnpkg.com/semver/-/semver-7.3.5.tgz#0b621c879348d8998e4b0e4be94b3f12e6018ef7',
            integrity:
              'sha512-PoeGJYh8HK4BTO/a9Tf6ZG3veo/A7ZVsYrSA6J8ny9nb3B1VrpkuN+z9OE5wfE5p6H4LchYZsegiQgbJD94ZFQ==',
            dependencies: {
              'lru-cache': '^6.0.0',
            },
          },
          'yallist@^4.0.0': {
            version: '4.0.0',
            resolved:
              'https://registry.yarnpkg.com/yallist/-/yallist-4.0.0.tgz#9bb92790d9c0effec63be73519e11a35019a3a72',
            integrity:
              'sha512-3wdGidZyq5PB084XLES5TpOSRA3wjXAlIWMhum2kRcv/41Sn2emQ0dycQW4uZXLejwKvg6EsvbdlVL+FYEct7A==',
          },
        },
      }
      const packageJSON = {
        name: 'valid',
        version: '1.0.0',
        main: 'index.js',
        license: 'MIT',
        dependencies: {
          lodash: '^4.17.21',
        },
        optionalDependencies: {
          semver: '^7.3.5',
        },
      }
      const dependencies = getDependencies(packageJSON, yarnLockJSON.object)
      expect(dependencies).toEqual({
        lodash: '^4.17.21',
        semver: '^7.3.5',
      })

      const packageJSONWithNonExistentPackage = {
        name: 'valid',
        version: '1.0.0',
        main: 'index.js',
        license: 'MIT',
        dependencies: {
          lodash: '^4.17.21',
        },
        optionalDependencies: {
          'semver': '^7.3.5',
          'non-existent-library': '^1.0.0',
        },
      }
      const dependenciesWithoutNonExistentDependencies = getDependencies(
        packageJSONWithNonExistentPackage,
        yarnLockJSON.object,
      )
      expect(dependenciesWithoutNonExistentDependencies).toEqual({
        lodash: '^4.17.21',
        semver: '^7.3.5',
      })
    })
  })
  describe('extractFromVersionedPackageName()', () => {
    it('should work properly', () => {
      expect(extractFromVersionedPackageName('foo@^1.2.3')).toEqual({
        packageName: 'foo',
        versionRange: '^1.2.3',
        semVerRange: '>=1.2.3 <2.0.0-0',
      })
      expect(extractFromVersionedPackageName('@foo/bar@^1.2.3')).toEqual({
        packageName: '@foo/bar',
        versionRange: '^1.2.3',
        semVerRange: '>=1.2.3 <2.0.0-0',
      })
      expect(extractFromVersionedPackageName('@foo/bar@master')).toEqual({
        packageName: '@foo/bar',
        versionRange: 'master',
        semVerRange: null,
      })
      expect(extractFromVersionedPackageName('@foo/bar')).toEqual({
        packageName: '@foo/bar',
        versionRange: '',
        semVerRange: null,
      })
      expect(extractFromVersionedPackageName('@foo/bar@*')).toEqual({
        packageName: '@foo/bar',
        versionRange: '*',
        semVerRange: '*',
      })
      expect(extractFromVersionedPackageName('@foo/bar@git+ssh://github.com/xyz/bar')).toEqual({
        packageName: '@foo/bar',
        versionRange: 'git+ssh://github.com/xyz/bar',
        semVerRange: null,
      })
      expect(
        extractFromVersionedPackageName('@foo/bar@git+ssh://github.com/xyz/bar#master'),
      ).toEqual({
        packageName: '@foo/bar',
        versionRange: 'git+ssh://github.com/xyz/bar#master',
        semVerRange: null,
      })
      expect(
        extractFromVersionedPackageName('@foo/bar@git+ssh://github.com/xyz/bar#semver:^2.3.4'),
      ).toEqual({
        packageName: '@foo/bar',
        versionRange: 'git+ssh://github.com/xyz/bar#semver:^2.3.4',
        semVerRange: '>=2.3.4 <3.0.0-0',
      })
      expect(
        extractFromVersionedPackageName('@foo/bar@git+ssh://github.com/xyz/bar#^2.3.4'),
      ).toEqual({
        packageName: '@foo/bar',
        versionRange: 'git+ssh://github.com/xyz/bar#^2.3.4',
        semVerRange: '>=2.3.4 <3.0.0-0',
      })
      expect(
        extractFromVersionedPackageName('@foo/bar@unsupported://github.com/xyz/bar#^2.3.4'),
      ).toEqual({
        packageName: '@foo/bar',
        versionRange: 'unsupported://github.com/xyz/bar#^2.3.4',
        semVerRange: null,
      })
    })
  })
  describe('buildResolutionsFromLockFileObject()', () => {
    it('should work properly', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const resolutions = buildResolutionsFromLockFileObject(workingContext.firstLevelDependencies)
      const expectedResolutions = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/resolutionsFromBuildResolutionsFromLockFileObject.json`,
          'utf-8',
        ),
      )
      expect(resolutions).toEqual(expectedResolutions)
    })
  })
  describe('buildResolutionsFromDependencies()', () => {
    it('should work properly', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const resolutions = buildResolutionsFromDependencies(
        getDependencies(workingContext.packageJSON, workingContext.firstLevelDependencies),
        workingContext.firstLevelDependencies,
        1,
      )
      const expectedResolutions = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/resolutionsFromBuildResolutionsFromDependencies.json`,
          'utf-8',
        ),
      )
      expect(resolutions).toEqual(expectedResolutions)
    })
    it('should survive circular dependency paths', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const work = () =>
        buildResolutionsFromDependencies(
          getDependencies(workingContext.packageJSON, workingContext.firstLevelDependencies),
          workingContext.firstLevelDependencies,
          null,
        )
      expect(work).not.toThrow()
    })
    it('should throw when an input dependency cannot be looked up', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const work = () =>
        buildResolutionsFromDependencies(
          {
            ...getDependencies(workingContext.packageJSON, workingContext.firstLevelDependencies),
            'non-existent-library': '^1.2.3',
          },
          workingContext.firstLevelDependencies,
          null,
        )
      expect(work).toThrow()
    })
  })
  describe('buildReachableDependencies()', () => {
    it('should work properly', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const reachableDependencies = buildReachableDependencies(
        getDependencies(workingContext.packageJSON, workingContext.firstLevelDependencies),
        workingContext.firstLevelDependencies,
      )
      const expectedReachableDependencies = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/reachableDependencies.json`,
          'utf-8',
        ),
      )
      expect(reachableDependencies).toEqual(expectedReachableDependencies)
    })
  })
  describe('buildOrphanedDependencies()', () => {
    it('should work properly', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const directDependencies = {
        ...getDependencies(workingContext.packageJSON, workingContext.firstLevelDependencies),
        ...workingContext.packageJSON.devDependencies,
      }
      delete directDependencies['react']
      const orphanedDependencies = buildOrphanedDependencies(
        directDependencies,
        workingContext.firstLevelDependencies,
      )
      const expectedOrphanedDependencies = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/orphanedDependencies.json`,
          'utf-8',
        ),
      )
      expect(orphanedDependencies).toEqual(expectedOrphanedDependencies)
    })
  })
  describe('buildDependencyPaths()', () => {
    it('should work properly', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const dependencyPaths = buildDependencyPaths(
        'react@17.0.1',
        workingContext.firstLevelDependencies,
      )
      const expectedDependencyPaths = JSON.parse(
        fs.readFileSync(`${__dirname}/../../__fixtures__/duplicated/dependencyPaths.json`, 'utf-8'),
      )
      expect(dependencyPaths).toEqual(expectedDependencyPaths)
    })
    it('should survive circular dependency paths', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const work = () =>
        buildDependencyPaths('react-native@0.64.1', workingContext.firstLevelDependencies)
      expect(work).not.toThrow()
    })
    it('should throw when input cannot be looked up', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const work = () =>
        buildDependencyPaths('non-existent-library@^2.3.4', workingContext.firstLevelDependencies)
      expect(work).toThrow()
    })
  })
  describe('buildDependencyPathsMap()', () => {
    it('should work properly', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const dependencyPathsMap = buildDependencyPathsMap(
        ['react@17.0.1', 'react-native-safe-area-context@^3.1.8'],
        workingContext.firstLevelDependencies,
      )
      const expectedDependencyPathsMap = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/dependencyPathsMap.json`,
          'utf-8',
        ),
      )
      expect(dependencyPathsMap).toEqual(expectedDependencyPathsMap)
    })
  })
  describe('buildVersionGroupedDependencyPathsMap()', () => {
    it('should work properly', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const dependencyPathsMap = buildVersionGroupedDependencyPathsMap(
        [
          '@react-navigation/core@^5.12.4',
          '@react-navigation/core@^5.0.0',
          '@react-navigation/core@^5.15.5',
        ],
        workingContext.firstLevelDependencies,
      )
      const expectedDependencyPathsMap = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/versionGroupedDependencyPathsMap.json`,
          'utf-8',
        ),
      )
      expect(dependencyPathsMap).toEqual(expectedDependencyPathsMap)
    })
  })
  describe('buildDeduplicatables()', () => {
    it('should work properly', () => {
      const workingContext = load(`${__dirname}/../../__fixtures__/duplicated`)
      const resolutions = buildResolutionsFromLockFileObject(workingContext.firstLevelDependencies)
      const { deduplicatables, packagesVersions } = buildDeduplicatables(resolutions)

      const expectedDeduplicatables = JSON.parse(
        fs.readFileSync(`${__dirname}/../../__fixtures__/duplicated/deduplicatables.json`, 'utf-8'),
      )
      const expectedPackagesVersions = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/packagesVersions.json`,
          'utf-8',
        ),
      )

      expect(deduplicatables).toEqual(expectedDeduplicatables)
      expect(packagesVersions).toEqual(expectedPackagesVersions)
    })
  })
})
