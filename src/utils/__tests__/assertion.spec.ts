import { assertNonNullish, assertTrue, CommonAssertionError } from '../assertion'

class CustomError extends Error {}

describe('assertion', () => {
  describe('assertTrue()', () => {
    it('should work properly', () => {
      expect(() => assertTrue(true)).not.toThrow()
      expect(() => assertTrue(false)).toThrow(CommonAssertionError)
      expect(() => assertTrue(false, new CustomError())).toThrow(CustomError)
    })
  })
  describe('assertNonNullish()', () => {
    it('should work properly', () => {
      expect(() => assertNonNullish('')).not.toThrow()
      expect(() => assertNonNullish(null)).toThrow()
    })
  })
})
