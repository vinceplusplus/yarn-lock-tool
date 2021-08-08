import fs from 'fs'
import fse from 'fs-extra'

import type { DedupeResolutionsType } from '../../types/types'
import { makeTempDir } from '../../utils/makeTempDir'
import {
  buildResolutionsFromDependencies,
  buildResolutionsFromLockFileObject,
  getDependencies,
} from '../analysis'
import { deduplicate, DeduplicateDelegate, deduplicateOnDirectory } from '../deduplication'
import { load } from '../io'

describe('deduplication', () => {
  describe('deduplicate()', () => {
    it('should work properly with buildResolutionsFromLockFileObject()', async () => {
      const dirPath = `${__dirname}/../../__fixtures__/duplicated`
      const workingContext = load(dirPath)

      const resolutions = buildResolutionsFromLockFileObject(workingContext.firstLevelDependencies)
      const delegate: DeduplicateDelegate = {
        onFoundOrphans: jest.fn(),
        onDeduplicated: jest.fn(),
        onRemovedUnreachable: jest.fn(),
      }
      deduplicate(workingContext, resolutions, delegate)

      const expectedFirstLevelDependencies = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/buildResolutionsFromLockFileObjectDeduplicatedFirstLevelDependencies.json`,
          'utf-8',
        ),
      )
      expect(workingContext.firstLevelDependencies).toEqual(expectedFirstLevelDependencies)
      expect(delegate.onFoundOrphans).toHaveBeenCalled()
      expect(delegate.onDeduplicated).toHaveBeenCalled()
      expect(delegate.onRemovedUnreachable).toHaveBeenCalled()
    })
    it('should work properly with buildResolutionsFromDependencies()', async () => {
      const dirPath = `${__dirname}/../../__fixtures__/duplicated`
      const workingContext = load(dirPath)

      const resolutions = buildResolutionsFromDependencies(
        getDependencies(workingContext.packageJSON, workingContext.firstLevelDependencies),
        workingContext.firstLevelDependencies,
        1,
      )
      deduplicate(workingContext, resolutions)

      const expectedFirstLevelDependencies = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../__fixtures__/duplicated/buildResolutionsFromDependenciesDeduplicatedFirstLevelDependencies.json`,
          'utf-8',
        ),
      )
      expect(workingContext.firstLevelDependencies).toEqual(expectedFirstLevelDependencies)
    })
  })
  describe('deduplicateOnDirectory()', () => {
    const test = (resolutionsType: DedupeResolutionsType) => {
      it(`should work properly with resolutionsType '${resolutionsType}'`, async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => '')

        const dirPath = await makeTempDir()
        fse.copySync(`${__dirname}/../../__fixtures__/duplicated`, dirPath)
        deduplicateOnDirectory({
          dirPath,
          resolutions: resolutionsType,
          printsLog: true,
          skirmishes: false,
        })

        const workingContext = load(dirPath)

        const expectedFirstLevelDependencies = JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../__fixtures__/duplicated/deduplicateOnDirectory/${resolutionsType}.json`,
            'utf-8',
          ),
        )

        expect(workingContext.firstLevelDependencies).toEqual(expectedFirstLevelDependencies)
        expect(consoleLogSpy).toHaveBeenCalled()

        consoleLogSpy.mockRestore()
      })
    }

    test('all')
    test('dependencies')
    test('devDependencies')
    test('dependenciesAndDevDependencies')
  })
})
