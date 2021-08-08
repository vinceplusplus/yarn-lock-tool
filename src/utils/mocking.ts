type FunctionArgumentTypes = never[]
type FunctionReturnType = unknown

type FA = FunctionArgumentTypes
type FR = FunctionReturnType

export const makeOriginalMockFn = <A extends FA, R extends FR>(
  originalFunction: (...args: A) => R,
): jest.Mock<R, A> => {
  return jest.fn((...args) => originalFunction(...args))
}

export const isMock = <A extends FA, R extends FR>(
  possiblyMockedFunction: (...args: A) => R,
): possiblyMockedFunction is jest.Mock<R, A> => {
  const mockFn = possiblyMockedFunction as jest.Mock<R, A>
  return typeof mockFn.getMockName === 'function'
}

type MockBackup = {
  mockFn: jest.Mock<FR, FA>
  implementation: ((...args: FA) => FR) | undefined
}

export class MockBackups {
  private backups: MockBackup[] = []

  backUp = (mockFn: (...args: FA) => FR) => {
    if (!isMock(mockFn)) {
      throw new Error('MockBackup.prototype.backUp(): mockFn is not a mocked function')
    }
    const implementation = mockFn.getMockImplementation()
    this.backups = [...this.backups, { mockFn, implementation }]
  }

  restore = () => {
    for (const backup of this.backups) {
      backup.mockFn.mockImplementation(backup.implementation)
    }
    this.backups = []
  }

  getBackupCount = () => {
    return this.backups.length
  }
}

export const asMockFnSafely = <A extends FA, R extends FR>(
  mockFn: (...args: A) => R,
): jest.Mock<R, A> => {
  if (!isMock(mockFn)) {
    throw new Error('asMockFnSafely(): mockedFunction is not a mocked function')
  }
  return mockFn
}
