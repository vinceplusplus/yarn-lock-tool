import { lazily } from '../lazilyGet'

describe('lazily', () => {
  it('should work properly', () => {
    const container: { [k: string]: { [k: string]: string } } = {}
    const lazyContainer = lazily(container)
    lazyContainer
      .get('a', () => ({}))
      .set('x', 'x')
      .set('y', 'y')
      .set('z', 'z')
    const b = lazyContainer
      .get('b', () => ({}))
      .set('p', 'p')
      .set('q', 'q')
      .set('r', 'r')
      .getCurrentContainer()
    const sameB = lazyContainer.get('b', () => ({})).getCurrentContainer()
    expect(container).toEqual({
      a: {
        x: 'x',
        y: 'y',
        z: 'z',
      },
      b: {
        p: 'p',
        q: 'q',
        r: 'r',
      },
    })
    expect(b).toEqual({
      p: 'p',
      q: 'q',
      r: 'r',
    })
    expect(sameB).toBe(b)
  })
})
