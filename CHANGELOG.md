# Release history and notes
[Sequence based identifiers](http://en.wikipedia.org/wiki/Software_versioning#Sequence-based_identifiers)
are used for versioning (schema follows below):

```
major.minor[.revision]
```

- It's always safe to upgrade within the same minor version (for example, from
  0.3 to 0.3.4).
- Minor version changes might be backwards incompatible. Read the
  release notes carefully before upgrading (for example, when upgrading from
  0.3.4 to 0.4).
- All backwards incompatible changes are mentioned in this document.

## 0.1.2

2021-11-19

- Minor fixes.

## 0.1.1

2021-11-17

```text
Release dedicated to my dear mother.
```

- Added more signatures (`HMACSHA256Signature`, `HMACSHA512Signature`).

## 0.1.0

2021-11-13

- Nicer API.
- Fix unicode bug.

## 0.0.6

2021-08-20

- Initial public beta release.
