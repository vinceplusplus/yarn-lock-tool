import { makeOriginalMockFn } from '../utils/mocking'

const originalOS = jest.requireActual('os')

module.exports = {
  ...originalOS,
  tmpdir: makeOriginalMockFn(originalOS.tmpdir),
}
