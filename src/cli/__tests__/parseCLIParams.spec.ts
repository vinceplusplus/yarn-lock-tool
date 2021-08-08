import { assertNonNullish, assertTrue } from '../../utils/assertion'
import { parseCLIParams } from '../parseCLIParams'
import type {
  DedupeJustParams,
  DedupeParams,
  ListParams,
  ListWithDependencyPathsParams,
} from '../types'

const parseDedupeParams = (args: string[]): DedupeParams => {
  const paramsContainer = parseCLIParams(['dedupe', ...args], true)
  assertNonNullish(paramsContainer)
  assertTrue(paramsContainer.type === 'dedupe')
  return paramsContainer.params
}

const parseDedupeJustParams = (args: string[]): DedupeJustParams => {
  const paramsContainer = parseCLIParams(['dedupeJust', ...args], true)
  assertNonNullish(paramsContainer)
  assertTrue(paramsContainer.type === 'dedupeJust')
  return paramsContainer.params
}

const parseListParams = (args: string[]): ListParams => {
  const paramsContainer = parseCLIParams(['list', ...args], true)
  assertNonNullish(paramsContainer)
  assertTrue(paramsContainer.type === 'list')
  return paramsContainer.params
}

const parseListWithDependencyPathsParams = (args: string[]): ListWithDependencyPathsParams => {
  const paramsContainer = parseCLIParams(['listWithDependencyPaths', ...args], true)
  assertNonNullish(paramsContainer)
  assertTrue(paramsContainer.type === 'listWithDependencyPaths')
  return paramsContainer.params
}

describe('cli', () => {
  it('should exit process if not arguments are passed', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => '')
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit()')
    })
    expect(() => parseCLIParams([])).toThrow('process.exit()')
    expect(processExitSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
    processExitSpy.mockRestore()
  })
  describe('should parse the `dedupe` command correctly', () => {
    it('with no arguments', () => {
      const params = parseDedupeParams([])
      expect(params.resolutions).toBe('all')
      expect(params.skirmishes).toBe(false)
    })

    it('with explicit `resolutions` argument', () => {
      ;(() => {
        const params = parseDedupeParams(['--resolutions', 'all'])
        expect(params.resolutions).toBe('all')
      })()
      ;(() => {
        const params = parseDedupeParams(['--resolutions', 'dependencies'])
        expect(params.resolutions).toBe('dependencies')
      })()
      ;(() => {
        const params = parseDedupeParams(['--resolutions', 'devDependencies'])
        expect(params.resolutions).toBe('devDependencies')
      })()
      ;(() => {
        const params = parseDedupeParams(['--resolutions', 'dependenciesAndDevDependencies'])
        expect(params.resolutions).toBe('dependenciesAndDevDependencies')
      })()
    })

    it('with explicit `skirmishes` argument', () => {
      const params = parseDedupeParams(['--skirmishes'])
      expect(params.skirmishes).toBe(true)
    })
  })

  describe('should parse the `dedupeJust` command correctly', () => {
    it('without arguments', () => {
      const params = parseDedupeJustParams([])
      expect(params.dependency).toBe(null)
      expect(params.newVersion).toBe(null)
    })
    it('with the dependency argument', () => {
      const params = parseDedupeJustParams(['abc', 'ijk'])
      expect(params.dependency).toBe('abc')
      expect(params.newVersion).toBe('ijk')
    })
  })

  describe('should parse the `list` command correctly', () => {
    it('with no arguments', () => {
      const params = parseListParams([])
      expect(params.depth).toBe(null)
      expect(params.maxArrayLength).toBe(null)
      expect(params.sortsByResolvedVersionCount).toBe(false)
      expect(params.showsAsJSON).toBe(false)
    })
    it('with simple arguments', () => {
      const params = parseListParams([
        '--depth',
        '2',
        '--maxArrayLength',
        '1',
        '--showsHavingMultipleVersionsOnly',
        'true',
        '--sortsByResolvedVersionCount',
        'true',
        '--showsAsJSON',
        'true',
      ])
      expect(params.depth).toBe(2)
      expect(params.maxArrayLength).toBe(1)
      expect(params.showsHavingMultipleVersionsOnly).toBe(true)
      expect(params.sortsByResolvedVersionCount).toBe(true)
      expect(params.showsAsJSON).toBe(true)
    })
  })

  describe('should parse the `listWithDependencyPaths` command correctly', () => {
    it('with no arguments', () => {
      const params = parseListWithDependencyPathsParams([])
      expect(params.depth).toBe(null)
      expect(params.maxArrayLength).toBe(null)
      expect(params.sources).toBe('dependencies')
      expect(params.filtersBySources).toBe(false)
      expect(params.sortsByDepth).toBe(false)
      expect(params.showsDuplicatedOnly).toBe(false)
      expect(params.showsAsJSON).toBe(false)
    })
    it('with explicit `depth` arguments', () => {
      const params = parseListWithDependencyPathsParams(['--depth', '4'])
      expect(params.depth).toBe(4)
    })
    it('with explicit `maxArrayLength` arguments', () => {
      const params = parseListWithDependencyPathsParams(['--maxArrayLength', '1'])
      expect(params.maxArrayLength).toBe(1)
    })
    it('with explicit `sources` arguments', () => {
      ;(() => {
        const params = parseListWithDependencyPathsParams(['--sources', 'dependencies'])
        expect(params.sources).toBe('dependencies')
      })()
      ;(() => {
        const params = parseListWithDependencyPathsParams(['--sources', 'devDependencies'])
        expect(params.sources).toBe('devDependencies')
      })()
      ;(() => {
        const params = parseListWithDependencyPathsParams([
          '--sources',
          'dependenciesAndDevDependencies',
        ])
        expect(params.sources).toBe('dependenciesAndDevDependencies')
      })()
    })
    it('with explicit `filtersBySources` arguments', () => {
      const params = parseListWithDependencyPathsParams(['--filtersBySources'])
      expect(params.filtersBySources).toBe(true)
    })
    it('with explicit `sortsByDepth` arguments', () => {
      const params = parseListWithDependencyPathsParams(['--sortsByDepth'])
      expect(params.sortsByDepth).toBe(true)
    })
    it('with explicit `showsDuplicatedOnly` arguments', () => {
      const params = parseListWithDependencyPathsParams(['--showsDuplicatedOnly'])
      expect(params.showsDuplicatedOnly).toBe(true)
    })
    it('with explicit `showsAsJSON` arguments', () => {
      const params = parseListWithDependencyPathsParams(['--showsAsJSON'])
      expect(params.showsAsJSON).toBe(true)
    })
  })
})
