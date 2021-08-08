import fs from 'fs'
import fse from 'fs-extra'
import inquirer from 'inquirer'

import { load } from '../../library'
import type { ListWithDependencyPathsSourcesType } from '../../types/types'
import { makeTempDir } from '../../utils/makeTempDir'
import { asMockFnSafely, MockBackups } from '../../utils/mocking'
import { main } from '../cli'
import { parseCLIParams } from '../parseCLIParams'

jest.mock('../parseCLIParams')

const replicateEnvironment = async (sourceDirPath: string, testAction: () => Promise<void>) => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => '')

  const oldCWD = process.cwd()

  const dirPath = await makeTempDir()
  fse.copySync(sourceDirPath, dirPath)

  process.chdir(dirPath)

  const mockBackups = new MockBackups()
  mockBackups.backUp(parseCLIParams)

  await testAction()

  mockBackups.restore()

  process.chdir(oldCWD)

  consoleLogSpy.mockRestore()
}

describe('cli', () => {
  describe('main()', () => {
    it('should do nothing without input', () => {
      const mockBackups = new MockBackups()
      mockBackups.backUp(parseCLIParams)
      asMockFnSafely(parseCLIParams).mockImplementation(() => null)

      expect(main).not.toThrow()

      mockBackups.restore()
    })
    describe('dedupe', () => {
      it('should work fine', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupe',
            params: {
              resolutions: 'all',
              skirmishes: false,
            },
          }))

          await main()

          const workingContext = load('.')
          const expectedFirstLevelDependencies = JSON.parse(
            fs.readFileSync(
              `${__dirname}/../../__fixtures__/duplicated/deduplicateOnDirectory/all.json`,
              'utf-8',
            ),
          )

          expect(workingContext.firstLevelDependencies).toEqual(expectedFirstLevelDependencies)
        })
      })
    })
    describe('dedupeJust', () => {
      it('should work fine', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: '@react-navigation/native@^5.0.0',
              newVersion: '5.7.4',
            },
          }))

          await main()

          const workingContext = load('.')
          const expectedWorkingContext = load(
            `${__dirname}/../../__fixtures__/duplicated/dedupeJust`,
          )

          expect(workingContext.firstLevelDependencies).toEqual(
            expectedWorkingContext.firstLevelDependencies,
          )
        })
      })
      it('should throw when version is not found', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: '@react-navigation/native@^5.0.0',
              newVersion: '5.7.5',
            },
          }))

          await expect(main()).rejects.toThrow()
        })
      })
      it('should throw when version cannot be satisfied', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: 'rimraf@^2.5.4',
              newVersion: '3.0.2',
            },
          }))

          await expect(main()).rejects.toThrow()
        })
      })
      it('should throw when there is no version range', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: 'temp@0.8.3',
              newVersion: '0.8.3',
            },
          }))

          await expect(main()).rejects.toThrow()
        })
      })
      it('should throw when no such versioned package name', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: 'temp@^0.8.4',
              newVersion: '0.8.5',
            },
          }))

          await expect(main()).rejects.toThrow()
        })
      })
      it('should throw when no versions to deduplicate to', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: '@react-navigation/core@^5.15.5',
              newVersion: '5.15.5',
            },
          }))

          await expect(main()).rejects.toThrow()
        })
      })
      it('should throw when no such package name', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: 'non-existent-library',
              newVersion: '5.15.5',
            },
          }))

          await expect(main()).rejects.toThrow()
        })
      })
      it('should work fine by prompting new version', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: '@react-navigation/native@^5.0.0',
              newVersion: null,
            },
          }))

          const inquirerRegisterPrompt = jest
            .spyOn(inquirer, 'registerPrompt')
            .mockImplementation(() => '')
          const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({
            version: '5.7.4',
          })

          await main()

          inquirerPromptSpy.mockRestore()
          inquirerRegisterPrompt.mockRestore()

          const workingContext = load('.')
          const expectedWorkingContext = load(
            `${__dirname}/../../__fixtures__/duplicated/dedupeJust`,
          )

          expect(workingContext.firstLevelDependencies).toEqual(
            expectedWorkingContext.firstLevelDependencies,
          )
        })
      })
      it('should work fine by prompting versioned package name and new version', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: '@react-navigation/native',
              newVersion: null,
            },
          }))

          const inquirerRegisterPrompt = jest
            .spyOn(inquirer, 'registerPrompt')
            .mockImplementation(() => '')
          const inquirerPromptSpy = jest
            .spyOn(inquirer, 'prompt')
            .mockResolvedValueOnce({
              versionedPackageName: '@react-navigation/native@^5.0.0',
            })
            .mockResolvedValueOnce({
              version: '5.7.4',
            })

          await main()

          inquirerPromptSpy.mockRestore()
          inquirerRegisterPrompt.mockRestore()

          const workingContext = load('.')
          const expectedWorkingContext = load(
            `${__dirname}/../../__fixtures__/duplicated/dedupeJust`,
          )

          expect(workingContext.firstLevelDependencies).toEqual(
            expectedWorkingContext.firstLevelDependencies,
          )
        })
      })
      it('should work fine by prompting package name, versioned package name and new version', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'dedupeJust',
            params: {
              dependency: null,
              newVersion: null,
            },
          }))

          const inquirerRegisterPrompt = jest
            .spyOn(inquirer, 'registerPrompt')
            .mockImplementation(() => '')
          const inquirerPromptSpy = jest
            .spyOn(inquirer, 'prompt')
            .mockResolvedValueOnce({
              packageName: '@react-navigation/native',
            })
            .mockResolvedValueOnce({
              versionedPackageName: '@react-navigation/native@^5.0.0',
            })
            .mockResolvedValueOnce({
              version: '5.7.4',
            })

          await main()

          inquirerPromptSpy.mockRestore()
          inquirerRegisterPrompt.mockRestore()

          const workingContext = load('.')
          const expectedWorkingContext = load(
            `${__dirname}/../../__fixtures__/duplicated/dedupeJust`,
          )

          expect(workingContext.firstLevelDependencies).toEqual(
            expectedWorkingContext.firstLevelDependencies,
          )
        })
      })
    })
    describe('list', () => {
      it('should work properly', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'list',
            params: {
              depth: null,
              maxArrayLength: null,
              showsHavingMultipleVersionsOnly: false,
              sortsByResolvedVersionCount: false,
              showsAsJSON: true,
            },
          }))

          const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => '')

          await main()

          expect(consoleLogSpy).toHaveBeenCalledTimes(1)

          const expectedDependencies = JSON.parse(
            fs.readFileSync(
              `${__dirname}/../../__fixtures__/duplicated/list/dependencies.json`,
              'utf-8',
            ),
          )

          expect(JSON.parse(consoleLogSpy.mock.calls?.[0]?.[0])).toEqual(expectedDependencies)

          consoleLogSpy.mockRestore()
        })
      })
      it('should work properly with `showsHavingMultipleVersionsOnly` and `sortsByResolvedVersionCount`', async () => {
        await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
          asMockFnSafely(parseCLIParams).mockImplementation(() => ({
            type: 'list',
            params: {
              depth: 2,
              maxArrayLength: 3,
              showsHavingMultipleVersionsOnly: true,
              sortsByResolvedVersionCount: true,
              showsAsJSON: false,
            },
          }))

          const consoleDirSpy = jest.spyOn(console, 'dir').mockImplementation(() => '')

          await main()

          expect(consoleDirSpy).toHaveBeenCalledTimes(1)

          const expectedDependencies = JSON.parse(
            fs.readFileSync(
              `${__dirname}/../../__fixtures__/duplicated/list/sortedFilteredDependencies.json`,
              'utf-8',
            ),
          )

          expect(consoleDirSpy.mock.calls?.[0]?.[0]).toEqual(expectedDependencies)
          expect(consoleDirSpy.mock.calls?.[0]?.[1]?.depth).toBe(2)
          expect(consoleDirSpy.mock.calls?.[0]?.[1]?.maxArrayLength).toBe(3)

          consoleDirSpy.mockRestore()
        })
      })
    })
    describe('listWithDependencyPaths', () => {
      const test = (sources: ListWithDependencyPathsSourcesType) => {
        it(`should work properly for \`${sources}\``, async () => {
          // NOTE: can only use a very simple setup to make things manageable here
          await replicateEnvironment(`${__dirname}/../../__fixtures__/valid`, async () => {
            asMockFnSafely(parseCLIParams).mockImplementation(() => ({
              type: 'listWithDependencyPaths',
              params: {
                depth: null,
                maxArrayLength: null,
                sources: sources,
                filtersBySources: false,
                sortsByDepth: false,
                showsDuplicatedOnly: false,
                showsAsJSON: true,
              },
            }))

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => '')

            await main()

            expect(consoleLogSpy).toHaveBeenCalledTimes(1)

            const expectedDependencies = JSON.parse(
              fs.readFileSync(
                `${__dirname}/../../__fixtures__/valid/listWithDependencyPaths/${sources}.json`,
                'utf-8',
              ),
            )

            expect(JSON.parse(consoleLogSpy.mock.calls?.[0]?.[0])).toEqual(expectedDependencies)

            consoleLogSpy.mockRestore()
          })
        })
      }
      test('dependencies')
      test('devDependencies')
      test('dependenciesAndDevDependencies')
    })
    it(`should work properly for other options`, async () => {
      await replicateEnvironment(`${__dirname}/../../__fixtures__/duplicated`, async () => {
        asMockFnSafely(parseCLIParams).mockImplementation(() => ({
          type: 'listWithDependencyPaths',
          params: {
            depth: 3,
            maxArrayLength: 4,
            sources: 'dependencies',
            filtersBySources: true,
            sortsByDepth: true,
            showsDuplicatedOnly: true,
            showsAsJSON: false,
          },
        }))

        const consoleDirSpy = jest.spyOn(console, 'dir').mockImplementation(() => '')

        await main()

        expect(consoleDirSpy).toHaveBeenCalledTimes(1)

        const expectedDependencies = JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../__fixtures__/valid/listWithDependencyPaths/otherOptions.json`,
            'utf-8',
          ),
        )

        expect(consoleDirSpy.mock.calls?.[0]?.[0]).toEqual(expectedDependencies)
        expect(consoleDirSpy.mock.calls?.[0]?.[1]?.depth).toBe(3)
        expect(consoleDirSpy.mock.calls?.[0]?.[1]?.maxArrayLength).toBe(4)

        consoleDirSpy.mockRestore()
      })
    })
  })
})
