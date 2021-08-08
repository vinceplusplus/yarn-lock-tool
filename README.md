<p>
  <a href="https://github.com/vinceplusplus/yarn-lock-tool/actions?query=workflow%3Atest+event%3Apush">
    <img src="https://github.com/vinceplusplus/yarn-lock-tool/workflows/test/badge.svg?event=push">
  </a>
  <a href="https://codecov.io/gh/vinceplusplus/yarn-lock-tool">
    <img src="https://codecov.io/gh/vinceplusplus/yarn-lock-tool/branch/master/graph/badge.svg" />
  </a>
</p>

# yarn-lock-tool

`yarn-lock-tool` is a tool to analyze and deduplicate dependencies found in a yarn lock file.

## Installation

To install through `yarn`
```shell
yarn global add yarn-lock-tool
```

## Usage

### Deduplicate all applicable dependencies

```shell
yarn-lock-tool dedupe
```

```shell
@babel/core@^7.7.5, 7.13.16 -> 7.14.2
@babel/generator@^7.13.16, 7.13.16 -> 7.14.2
@babel/helper-function-name@^7.12.13, 7.12.13 -> 7.14.2

  ...

- @babel/generator@^7.13.16, 7.14.2
- @babel/helper-function-name@^7.12.13, 7.14.2
- @babel/helper-module-transforms@^7.13.14, 7.14.2

  ...

Updated 25 dependency resolution(s)
Removed 11 dependency resolution(s)

Don't forget to run `yarn` to clean up the ghost entries in `yarn.lock`
```

Deduplicate all applicable dependencies in the current directory (where `package.json` and
`yarn.lock` reside). For every dependency resolution in `yarn.lock`, the tool will look for the
highest version that satisfies the specified version range and replace with this highest
version if found.

`--resolutions`
- `all` - source resolutions in `yarn.lock`
- `dependencies` - source resolutions derived from `dependencies` and `optionalDependencies` in
  `package.json`
- `devDependencies` - source resolutions derived from `devDependencies` in `package.json`
- `dependenciesAndDevDependencies` - combines both `dependencies` and `devDependencies`

Defaults to `all` if not specified. It is useful to use `dependencies` or the like to use the
resolutions of the direct dependencies of the current package to deduplicate. This way, it will try
to have the same copies of the direct dependencies to operate from inside indirect dependencies. In
other words, it will minimize the deduplication surface to just the direct dependencies so any
nested dependencies that are not also direct dependencies will not be affected.

For instance, you are working on `A` and it requires `B` and `C`, then `C` requires `B`.
```
└── A
    ├── B (^1.0 -> 1.1)
    └── C
        └── B (^1.0 -> 1.2)
```
By using `dependencies` or the like, it could result in
```
└── A
    ├── B (^1.0 -> 1.1)
    └── C
        └── B (^1.0 -> 1.1)
```
This could be needed if you need just one copy of `B` to run in your app. For example, if `B` will
create, expose and use some `React`'s context, and `C` has a different `B` than the `B` inside `A`,
depending on where the code runs it might not be able to consume the intended context and things
could break loose. So by ensuring resolving to the same version would guarantee that you are always
working on the only instance of a certain library.

Another scenario that could be easily understandable could be that `B` is a common UI library that
both app `A` and shared module `B` make use. In this case, you might want to make sure there is only
one instance of `B` is running.  

`--skirmishes`
Perform deduplication and print logs but do not write to `yarn.lock`

### Deduplicate a single dependency

```shell
yarn-lock-tool dedupeJust abc[@x.y.z] i.j.k
```

- `abc` - package name
- `x.y.z` - version range specified in `package.json`, i.e. ^1.0.0
- `i.j.k` - an existing resolvable version in `yarn.lock` to resolve the said dependency

Depending on how much you provide, the tool might prompt you to choose in order to perform deduplication.

Sometimes, if an indirect dependency is out of date to support the current use cases, you could add the
desired version as a direct dependency and use `dedupeJust` to deduplicate to upgrade to the desired
dependency. Then you could remove that direct dependency when done.

```shell
yarn add abc@new-version
yarn-lock-tool dedupeJust abc@^old-version new-version
yarn remove abc@new-version
```

### List dependencies

Could be used to analyze duplicated dependencies

```shell
yarn-lock-tool list --showsHavingMultipleVersionsOnly --sortsByResolvedVersionCount --depth 1
```

```shell
{
  'type-fest': {
    'type-fest@^0.13.1': [Object],
    'type-fest@^0.18.0': [Object],
    'type-fest@^0.20.2': [Object],
    'type-fest@^0.21.3': [Object],
    'type-fest@^0.3.0': [Object],
    'type-fest@^0.6.0': [Object],
    'type-fest@^0.8.0': [Object],
    'type-fest@^0.8.1': [Object]
  },
  'find-up': {
    'find-up@^1.0.0': [Object],
    'find-up@^2.0.0': [Object],
    'find-up@^2.1.0': [Object],
    'find-up@^3.0.0': [Object],
    'find-up@^4.0.0': [Object],
    'find-up@^4.1.0': [Object],
    'find-up@^5.0.0': [Object]
  },
  ...
}
```

### List dependencies by dependency paths

Could be used to analyze duplicated dependencies by dependency paths. It could show how certain
dependencies could be reached.

```shell
yarn-lock-tool listWithDependencyPaths --sources devDependencies --sortsByDepth --filtersBySources --showsDuplicatedOnly --depth 4
```

```shell
{
  ...
  '@types/node': {
    '15.0.1': {
      '@types/node@^15.0.1': [
        [
          '@types/node@^15.0.1'
        ]
      ]
    },
    '15.0.3': {
      '@types/node@*': [
        [
          '@types/inquirer@^7.3.3',
          '@types/through@*',
          '@types/node@*'
        ],
        [
          '@types/inquirer-autocomplete-prompt@^1.3.2',
          '@types/inquirer@*',
          '@types/through@*',
          '@types/node@*'
        ],
        ...
      ]
      ...
    }
  }
  ...
}
```

### Automate duplication check
Could add as a form of unit test
```typescript
import { buildResolutionsFromLockFileObject, deduplicate, load } from 'yarn-lock-tool'

it('there should be no dependencies to deduplicate', () => {
  const workingContext = load('.')
  const resolutions = buildResolutionsFromLockFileObject(workingContext.firstLevelDependencies)

  let deduplicated: string[] = []
  let removedUnreachables: string[] = []
  deduplicate(workingContext, resolutions, {
    onDeduplicated: (versionedPackageName) => {
      deduplicated = [...deduplicated, versionedPackageName]
    },
    onRemovedUnreachable: (versionedPackageName) => {
      removedUnreachables = [...removedUnreachables, versionedPackageName]
    },
  })

  expect(deduplicated).toEqual([])
  expect(removedUnreachables).toEqual([])
})
```

## Why?
When `yarn` install packages without a `yarn.lock` file, it will deduplicate. However, newer
installations will not deduplicate the existing dependencies to reduce risk of breaking, over time,
duplicated dependencies will build up.

Duplicated dependencies could result in an increase of app size. Depending on how stateful a
dependency is, a duplicated dependency might result in undefined app behavior.

Therefore, either use some tool like this one to deduplicate or delete the existing `yarn.lock` and
re-install dependencies again.
