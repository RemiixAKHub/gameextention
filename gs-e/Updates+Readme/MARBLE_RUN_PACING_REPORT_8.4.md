# Marble Run — Long-Course Pacing Report 8.4

## Result

**PASS**

## Timing model

Race timing is derived from:

1. Finish distance relative to the original 2400px course.
2. Section count relative to the original 13 sections.
3. Specialist-obstacle complexity.
4. Live obstacle counts.
5. Race roster size.

## Current reference values

| Course | Race limit | Finish grace | Reserve |
|---|---:|---:|---:|
| Classic fixed course | 122s | approximately 10s | calculated when needed |
| Seed-1 Obstacle Showcase | 306s | 24s | 45s |

All values remain inside these hard limits:

- Race limit: 90–360 seconds
- Finish grace: 8–24 seconds
- Reserve extension: 12–45 seconds

## Reserve-time rule

Reserve time is granted once only when:

- the base deadline has been reached;
- the leader is still racing;
- the leader made at least 24px of recent downward progress.

A stalled race does not receive the extension.

## Automated verification

- Tracks built and tested: 180
- Control combinations: 9
- Long average timeout exceeds Short for Light, Balanced and Heavy
- Compatibility: PASS
- Structural validation: PASS
- Dynamic geometry: PASS
- Reserved showcase aliases: PASS
- Built-in pacing audit: PASS
- JavaScript syntax: PASS

## Developer status

`RACE PACING: PASS`

Expected compact result:

`DEV CHECKS: 23/23 PASS`
