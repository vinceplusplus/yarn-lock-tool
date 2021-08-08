import { asMockFnSafely, isMock, makeOriginalMockFn, MockBackups } from '../mocking'

const originalFunction = () => 'originalFunction'

describe('mocking', () => {
  describe('makeOriginalMockFn()', () => {
    it('should make a mock fn with original implementation', () => {
      const mockFn = makeOriginalMockFn(originalFunction)
      expect(mockFn()).toBe('originalFunction')
      expect(isMock(mockFn as typeof originalFunction)).toBe(true)
    })
  })
  describe('isMock()', () => {
    it('should test properly', () => {
      expect(isMock(() => '')).toBe(false)
      expect(isMock(jest.fn())).toBe(true)
    })
  })
  describe('MockBackups', () => {
    it('should back up and restore properly', () => {
      const mockBackups = new MockBackups()
      const mockFn = jest.fn(() => 'original')
      expect(mockFn()).toBe('original')

      mockBackups.backUp(mockFn)
      expect(mockBackups.getBackupCount()).toBe(1)

      mockFn.mockImplementation(() => 'updated')
      expect(mockFn()).toBe('updated')

      mockBackups.restore()
      expect(mockBackups.getBackupCount()).toBe(0)

      expect(mockFn()).toBe('original')
    })
    it(`should throw when backUp()'s input isn't a mockFn`, () => {
      const mockBackups = new MockBackups()
      expect(() => mockBackups.backUp(() => '')).toThrow()
    })
  })
  describe('asMockFnSafely', () => {
    it('should type assert properly', () => {
      const func = () => ''
      const mockFn = jest.fn(func)
      expect(asMockFnSafely(mockFn as typeof func)).toBe(mockFn)
    })
    it(`should throw if input isn't a mockFn`, () => {
      expect(() => asMockFnSafely(() => '')).toThrow()
    })
  })
})
