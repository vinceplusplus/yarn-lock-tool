import { makeOriginalMockFn } from '../../utils/mocking'

const originalModule = jest.requireActual('../parseCLIParams')

module.exports = {
  ...originalModule,
  parseCLIParams: makeOriginalMockFn(originalModule.parseCLIParams),
}
