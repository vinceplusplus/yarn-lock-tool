export class CommonAssertionError extends Error {
  constructor(message: string) {
    super(message)
  }
}

const throwAssertionError = (messageOrError: string | Error) => {
  if (typeof messageOrError === 'string') {
    // NOTE: require node environment, need special handling for environments not supporting it, e.g. react-native, web
    throw new CommonAssertionError(messageOrError)
  } else {
    throw messageOrError
  }
}

export function assertTrue(condition: boolean, messageOrError?: string | Error): asserts condition {
  if (!condition) {
    throwAssertionError(messageOrError ?? 'assertion failure')
  }
}

export function assertNonNullish<Value>(
  value: Value,
  messageOrError?: string | Error,
): asserts value is NonNullable<Value> {
  assertTrue(value != null, messageOrError ?? 'non-nullish assertion failure')
}
