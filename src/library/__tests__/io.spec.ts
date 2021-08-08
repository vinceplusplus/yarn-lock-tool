import { copyFileSync, rmdirSync } from 'fs'

import { makeTempDir } from '../../utils/makeTempDir'
import { load, save } from '../io'

describe('ios', () => {
  describe('load()', () => {
    it('should load properly', () => {
      const expectedYarnLockJSON = {
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
      const expectedPackageJSON = {
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

      const dirPath = `${__dirname}/../../__fixtures__/valid`

      const workingContext = load(dirPath)

      expect(workingContext).toBeTruthy()
      expect(workingContext.dirPath).toBe(dirPath)
      expect(workingContext.yarnLockJSON).toEqual(expectedYarnLockJSON)
      expect(workingContext.firstLevelDependencies).toEqual(expectedYarnLockJSON.object)
      expect(workingContext.packageJSON).toEqual(expectedPackageJSON)
    })
    it('should throw when given non existent directory', () => {
      const dirPath = `${__dirname}/../../__fixtures__/nonExistentDirectory`
      expect(() => load(dirPath)).toThrow()
    })
    it('should throw when given a directory with invalid `yarn.lock`', () => {
      const dirPath = `${__dirname}/../../__fixtures__/invalid`
      expect(() => load(dirPath)).toThrow(Error)
    })
    it('should throw when given `yarn.lock` has merge conflicts', () => {
      const dirPath = `${__dirname}/../../__fixtures__/conflict`
      expect(() => load(dirPath)).toThrow(Error)
    })
    it('should throw when the same version sanity check fails', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => '')

      const dirPath = `${__dirname}/../../__fixtures__/sameVersion`
      expect(() => load(dirPath)).toThrow(Error)

      consoleLogSpy.mockRestore()
    })
  })
  describe('save()', () => {
    it('should save properly', async () => {
      const dirPath = `${__dirname}/../../__fixtures__/valid`
      const workingContext = load(dirPath)
      const tempDirPath = await makeTempDir()
      save(workingContext, tempDirPath)

      copyFileSync(`${dirPath}/package.json`, `${tempDirPath}/package.json`)
      const newWorkingContext = load(tempDirPath)
      expect(newWorkingContext.yarnLockJSON).toEqual(workingContext.yarnLockJSON)

      rmdirSync(tempDirPath, { recursive: true })
    })
  })
})
