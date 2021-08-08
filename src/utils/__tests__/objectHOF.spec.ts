import { makeObjectHOF } from '../objectHOF'

describe('objectHOF', () => {
  it('clones should work', () => {
    const object = {
      e: 1,
      i: 2,
      c: 3,
      a: 4,
      b: 5,
      f: 6,
      g: 7,
      d: 8,
      h: 9,
    }
    const newObject = makeObjectHOF(object, { clones: true })
      .filter((_, value) => value % 2 === 0)
      .getObject()
    expect(object).toEqual({
      e: 1,
      i: 2,
      c: 3,
      a: 4,
      b: 5,
      f: 6,
      g: 7,
      d: 8,
      h: 9,
    })
    expect(newObject).toEqual({
      i: 2,
      a: 4,
      f: 6,
      d: 8,
    })
  })
  it('sort() should work properly', () => {
    const object = {
      e: 1,
      i: 2,
      c: 3,
      a: 4,
      b: 5,
      f: 6,
      g: 7,
      d: 8,
      h: 9,
    }
    const objectHOF = makeObjectHOF(object)
    expect(Object.keys(object)).toEqual(['e', 'i', 'c', 'a', 'b', 'f', 'g', 'd', 'h'])
    objectHOF.sort()
    expect(Object.keys(object)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'])
    objectHOF.sort((...[[, value1], [, value2]]) => value1 - value2)
    expect(Object.keys(object)).toEqual(['e', 'i', 'c', 'a', 'b', 'f', 'g', 'd', 'h'])
  })
  it('filter() should work properly', () => {
    const object = {
      0: true,
      1: true,
      2: true,
      3: true,
      4: true,
      5: false,
      6: false,
      7: false,
      8: false,
      9: false,
    }
    const objectHOF = makeObjectHOF(object)
    objectHOF.filter((key) => Number(key) % 2 === 0)
    expect(object).toEqual({
      0: true,
      2: true,
      4: true,
      6: false,
      8: false,
    })
    objectHOF.filter((_, value) => value)
    expect(object).toEqual({
      0: true,
      2: true,
      4: true,
    })
  })
  it('traverse() should work properly', () => {
    const object = {
      apple: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: false,
        6: false,
        7: false,
        8: false,
        9: false,
      },
      orange: {
        0: false,
        1: false,
        2: false,
        3: false,
        4: false,
        5: true,
        6: true,
        7: true,
        8: true,
        9: true,
      },
    }
    const objectHOF = makeObjectHOF(object)
    objectHOF
      .traverse()
      .filter((key) => Number(key) % 2 === 0)
      .filter((_, value) => value)
    expect(object).toEqual({
      apple: {
        0: true,
        2: true,
        4: true,
      },
      orange: {
        6: true,
        8: true,
      },
    })
  })
  it('map() should work properly', () => {
    const object = {
      0: true,
      1: true,
      2: true,
      3: true,
      4: true,
      5: false,
      6: false,
      7: false,
      8: false,
      9: false,
    }
    makeObjectHOF(object)
      .filter((key) => Number(key) % 2 === 0)
      .map((value, key) => `${key}: ${value}`)
    expect(object).toEqual({
      0: '0: true',
      2: '2: true',
      4: '4: true',
      6: '6: false',
      8: '8: false',
    })
  })
  it('substitute() should work properly', () => {
    const object: { [key: string]: { items: { [key: string]: string } } } = {
      a: {
        items: { 0: '1', 1: '2', 2: '3' },
      },
      b: {
        items: { 0: '1', 1: '3', 2: '5' },
      },
      c: {
        items: { 0: '2', 1: '4', 2: '6' },
      },
    }
    const newObject = makeObjectHOF(object, { clones: true })
      .substitute((sub) => {
        return sub
          .traverse()
          .traverse()
          .map((value) => Number(value))
      })
      .map((value) => {
        const sum = Object.values(value.items).reduce((running, value) => running + value, 0)
        return {
          sum: sum,
        }
      })
      .getObject()
    expect(newObject).toEqual({
      a: {
        sum: 6,
      },
      b: {
        sum: 9,
      },
      c: {
        sum: 12,
      },
    })
  })
  it('minor getters should work properly', () => {
    const object = {
      a: {
        i: {
          item: 1,
        },
        j: {
          item: 2,
        },
        k: {
          item: 3,
        },
      },
      b: {
        p: {
          item: 1,
        },
        q: {
          item: 1,
        },
        r: {
          item: 1,
        },
      },
      c: {
        x: {
          item: 1,
        },
        y: {
          item: 1,
        },
        z: {
          item: 1,
        },
      },
    }
    const objectHOF1 = makeObjectHOF(object)
    expect(objectHOF1.getObject()).toBe(object)
    expect(objectHOF1.getSubobjects().length).toBe(1)
    expect(objectHOF1.getSubobjects()[0]).toBe(object)
    expect(objectHOF1.getCurrentContainers().length).toBe(1)
    expect(objectHOF1.getCurrentContainers()[0]).toBe(object)

    const objectHOF2 = objectHOF1.traverse()
    const testObjectHOF2 = () => {
      expect(objectHOF2.getObject()).toBe(object)
      expect(objectHOF2.getSubobjects().length).toBe(1)
      expect(objectHOF2.getSubobjects()[0]).toBe(object)
      expect(objectHOF2.getCurrentContainers().length).toBe(3)
      expect(objectHOF2.getCurrentContainers()[0]).toBe(object.a)
      expect(objectHOF2.getCurrentContainers()[1]).toBe(object.b)
      expect(objectHOF2.getCurrentContainers()[2]).toBe(object.c)
    }

    testObjectHOF2()

    objectHOF2.substitute((sub) => {
      const objectHOF3 = sub.traverse()
      expect(objectHOF3.getObject()).toBe(object)
      expect(objectHOF3.getSubobjects().length).toBe(3)
      expect(objectHOF3.getSubobjects()[0]).toBe(object.a)
      expect(objectHOF3.getSubobjects()[1]).toBe(object.b)
      expect(objectHOF3.getSubobjects()[2]).toBe(object.c)
      expect(objectHOF3.getCurrentContainers().length).toBe(9)
      expect(objectHOF3.getCurrentContainers()[0]).toBe(object.a.i)
      expect(objectHOF3.getCurrentContainers()[1]).toBe(object.a.j)
      expect(objectHOF3.getCurrentContainers()[2]).toBe(object.a.k)
      expect(objectHOF3.getCurrentContainers()[3]).toBe(object.b.p)
      expect(objectHOF3.getCurrentContainers()[4]).toBe(object.b.q)
      expect(objectHOF3.getCurrentContainers()[5]).toBe(object.b.r)
      expect(objectHOF3.getCurrentContainers()[6]).toBe(object.c.x)
      expect(objectHOF3.getCurrentContainers()[7]).toBe(object.c.y)
      expect(objectHOF3.getCurrentContainers()[8]).toBe(object.c.z)
      return objectHOF3
    })

    testObjectHOF2()
  })
})
