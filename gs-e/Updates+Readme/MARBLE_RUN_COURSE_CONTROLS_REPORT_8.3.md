# Marble Run — Course Controls Report 8.3

## Result

**PASS**

## Controls

| Control | Values |
|---|---|
| Length | Short, Standard, Long |
| Obstacles | Light, Balanced, Heavy |

## Length limits

| Setting | Section range |
|---|---:|
| Short | 12-13 |
| Standard | 12-15 |
| Long | 16-17 |

## Obstacle weighting

- Light selects from the lower specialist-obstacle portion of the eligible
  catalogue.
- Balanced uses the complete eligible catalogue.
- Heavy selects from the higher specialist-obstacle portion and may add a safe
  live-obstacle extension.

## Determinism

Generation combines:

`seed + length + obstacle rate`

Standard/Balanced deliberately retains the original raw-seed stream so earlier
saved seed behaviour is preserved.

## Favourite migration

Existing favourites without Phase 8.3 settings load as Standard/Balanced.

Generated favourites now use seed, mode, length and obstacle rate as their
unique identity.

## Runtime verification

- Tracks tested: 360
- Control combinations: 9
- Compatibility: PASS
- Full track validation: PASS
- Dynamic geometry: PASS
- Showcase protection: PASS
- JavaScript syntax: PASS

## Developer status

`COURSE CONTROLS: PASS`

Expected compact result:

`DEV CHECKS: 22/22 PASS`
