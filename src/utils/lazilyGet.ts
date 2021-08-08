// TODO: extract to a package
// https://dev.to/busypeoples/notes-on-typescript-mapped-types-and-lookup-types-i36
const get = <Container, Key extends keyof Container>(
  container: Container,
  key: Key,
  buildDefaultValue: () => NonNullable<Container[Key]>,
): NonNullable<Container[Key]> => {
  const isNonNullable = <Value>(value: Value): value is NonNullable<Value> => {
    return value != null
  }

  const value = container[key]
  if (isNonNullable(value)) {
    return value
  }
  const defaultValue = buildDefaultValue()
  container[key] = defaultValue
  return defaultValue
}

class LazyProperties<Container> {
  private readonly container: Container

  constructor(container: Container) {
    this.container = container
  }

  get = <Key extends keyof Container>(
    key: Key,
    buildDefaultValue: () => NonNullable<Container[Key]>,
  ): LazyProperties<NonNullable<Container[Key]>> => {
    return new LazyProperties(get(this.container, key, buildDefaultValue))
  }

  set = <Key extends keyof Container>(key: Key, value: Container[Key]) => {
    this.container[key] = value
    return this
  }

  getCurrentContainer = () => {
    return this.container
  }
}

export const lazily = <Container>(container: Container) => {
  return new LazyProperties(container)
}
