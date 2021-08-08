import { lstatSync, rmdirSync } from 'fs'
import * as os from 'os'
import path from 'path'

import { makeTempDir } from '../makeTempDir'
import { asMockFnSafely, MockBackups } from '../mocking'

jest.mock('os')

describe('makeTempDir()', () => {
  it('should make a temporary directory properly', async () => {
    const dirPath = await makeTempDir()
    const isDirectory = lstatSync(dirPath).isDirectory()
    expect(isDirectory).toBe(true)
    rmdirSync(dirPath, { recursive: true })
  })
  it('should reject when making a temporary directory fails', async () => {
    const dirPath = await makeTempDir()

    const mockBackups = new MockBackups()
    mockBackups.backUp(os.tmpdir)

    asMockFnSafely(os.tmpdir).mockImplementation(() => path.join(dirPath, 'non-existent-directory'))
    await expect(makeTempDir()).rejects.toThrow()

    mockBackups.restore()
  })
})
