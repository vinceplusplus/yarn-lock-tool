import { mkdtemp } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

export const makeTempDir = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    mkdtemp(path.join(tmpdir(), 'temp-'), (error, dirPath) => {
      if (error) {
        reject(error)
      }
      resolve(dirPath)
    })
  })
}
