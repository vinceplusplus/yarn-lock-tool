const __FIXME__typeAssert = <SourceType, DestinationType>(value: SourceType): DestinationType => {
  return value as unknown as DestinationType
}

type InitializationOptions = {
  clones: boolean
}

type ObjectKey<Container> = keyof Container extends string ? keyof Container : never

class ObjectHOF<ObjectType, SubobjectType, Container, Key extends ObjectKey<Container>> {
  private readonly object: ObjectType
  private readonly subobjects: SubobjectType[]
  private readonly containers: Container[]

  constructor(object: ObjectType, subobjects: SubobjectType[], containers: Container[]) {
    this.object = object
    this.subobjects = subobjects
    this.containers = containers
  }

  sort = (compareFn?: (a: [Key, Container[Key]], b: [Key, Container[Key]]) => number) => {
    for (const container of this.containers) {
      const entries: [Key, Container[Key]][] = __FIXME__typeAssert(Object.entries(container))
      for (const [key] of entries) {
        delete container[key]
      }
      entries.sort((entry1, entry2) => {
        if (compareFn == null) {
          return entry1[0].localeCompare(entry2[0])
        } else {
          return compareFn(entry1, entry2)
        }
      })
      for (const [key, value] of entries) {
        container[key] = value
      }
    }
    return this
  }

  filter = (predicate: (key: Key, value: Container[Key]) => boolean) => {
    for (const container of this.containers) {
      const entries: [Key, Container[Key]][] = __FIXME__typeAssert(Object.entries(container))
      for (const [key, value] of entries) {
        if (!predicate(key, value)) {
          delete container[key]
        }
      }
    }
    return this
  }

  map = <NewValue>(callbackFn: (value: Container[Key], key: Key) => NewValue) => {
    type Value = Container[Key]
    type NewContainer = { [key in Key]: NewValue }
    let newContainers: NewContainer[] = []
    for (const container of this.containers) {
      const newContainer: NewContainer = __FIXME__typeAssert(container)
      const entries: [Key, Value][] = __FIXME__typeAssert(Object.entries(container))
      for (const [key, value] of entries) {
        const newValue = callbackFn(value, key)
        delete container[key]
        newContainer[key] = newValue
      }
      newContainers = [...newContainers, newContainer]
    }
    const newObject: ReplaceValueType<ObjectType, Value, NewValue> = __FIXME__typeAssert(
      this.object,
    )
    const newSubobjects: ReplaceValueType<SubobjectType, Value, NewValue>[] = __FIXME__typeAssert(
      this.subobjects,
    )
    return new ObjectHOF(newObject, newSubobjects, newContainers)
  }

  traverse = () => {
    type Value = Container[Key]
    const newContainers: Value[] = []
    for (const container of this.containers) {
      const values: Value[] = __FIXME__typeAssert(Object.values(container))
      newContainers.push(...values)
    }
    return new ObjectHOF(this.object, this.subobjects, newContainers)
  }

  substitute = <NewObjectType, NewSubobjectType, NewContainer>(
    block: (
      subobjectHOF: ObjectHOF<ObjectType, Container, Container, ObjectKey<Container>>,
    ) => ObjectHOF<NewObjectType, NewSubobjectType, NewContainer, ObjectKey<NewContainer>>,
  ): ObjectHOF<NewObjectType, NewSubobjectType, NewSubobjectType, ObjectKey<NewSubobjectType>> => {
    const inputObjectHOF = new ObjectHOF(this.object, this.containers, this.containers)
    block(inputObjectHOF)
    const newObject: NewObjectType = __FIXME__typeAssert(this.object)
    const newSubobjects: NewSubobjectType[] = __FIXME__typeAssert(this.subobjects)
    const newContainers: NewSubobjectType[] = __FIXME__typeAssert(this.containers)
    return new ObjectHOF(newObject, newSubobjects, newContainers)
  }

  getObject = () => {
    return this.object
  }

  getSubobjects = () => {
    return this.subobjects
  }

  getCurrentContainers = () => {
    return this.containers
  }
}

export const objectHOF = <Container>(
  container: Container,
  initializationOptions?: InitializationOptions,
) => {
  const inputContainer: Container = (() => {
    if (initializationOptions?.clones === true) {
      const newContainer: Container = __FIXME__typeAssert(
        JSON.parse(JSON.stringify(container)) as unknown,
      )
      return newContainer
    } else {
      return container
    }
  })()
  return new ObjectHOF(inputContainer, [inputContainer], [inputContainer])
}

type ReplaceValueType<Container, Value, NewValue> = Container[keyof Container] extends Record<
  string,
  unknown
>
  ? Container[keyof Container] extends Value
    ? { [key in keyof Container]: NewValue }
    : {
        [key in keyof Container]: ReplaceValueType<Container[keyof Container], Value, NewValue>
      }
  : never
