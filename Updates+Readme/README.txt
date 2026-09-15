Marble Run Roadmap V3
Phase 8.4 - Long-Course Timeout and Pacing Refinement

Installation
1. Extract this ZIP.
2. Copy marblerun.js into js/games/marblerun.js.
3. Replace the existing file.
4. Reload the unpacked extension.

WHAT CHANGED

DYNAMIC RACE LIMIT
The timeout now considers:
- generated finish distance;
- number of track sections;
- specialist obstacle load;
- live obstacles such as Domes, Balance Beam, Split Gate and Bounce Chamber;
- race roster size.

The original fixed course remains close to its existing two-minute timing.

DYNAMIC FINISH GRACE
After the first marble finishes:
- Short and standard races retain a compact grace window.
- Long and obstacle-heavy races receive more time for the remaining pack.
- The grace period is capped at 24 seconds.

PROGRESS-BASED RESERVE TIME
At the normal deadline:
- If the leader is still making genuine downward progress, the race receives
  one reserve-time extension.
- If the pack is genuinely stalled, the normal timeout resolves the race.
- Only one extension can occur.

This avoids cutting off healthy long races without allowing stalled races to
run indefinitely.

LIVE COUNTDOWN
The existing canvas badge now displays:
- LIVE · remaining time
- EXT · remaining reserve time, when the extension is active

No new screen row was added.

CURRENT AUDIT VALUES
- Classic race limit: 122s
- Seed-1 showcase limit: 306s
- Seed-1 finish grace: 24s
- Seed-1 reserve extension: 45s

DEVELOPER CHECKS
New check:
RACE PACING: PASS

Expected result:
DEV CHECKS: 23/23 PASS

PROTECTED BEHAVIOUR
- Marble physics profile is unchanged.
- Seed hashing and generated layouts are unchanged.
- Length and obstacle controls are unchanged.
- Favourite seeds are unchanged.
- Seed-1 remains the complete Obstacle Showcase.
- Finish Funnel and first-to-last queue remain active.
- Payouts, Single, Duel and BO3 rules are unchanged.
- No shared extension files were modified.

AUTOMATED VERIFICATION
- Generated tracks tested: 180
- Length/frequency combinations: 9/9
- Short-to-Long pacing scale: PASS
- Timeout bounds: PASS
- Finish-grace bounds: PASS
- Reserve-time bounds: PASS
- Seed-1 aliases: PASS
- Track compatibility and geometry: PASS
- JavaScript syntax: PASS

TESTING
1. Confirm DEV CHECKS shows 23/23 PASS.
2. Run one Short course and note the countdown.
3. Run the same seed as Long and confirm it receives more time.
4. Run a Heavy course and confirm the timer reflects its obstacle load.
5. Generate seed-1 and confirm it receives the longest practical timer.
6. Confirm the countdown changes from LIVE to EXT only if reserve time is used.
7. Confirm a first finisher does not instantly end a long race.
8. Complete Single, Duel and BO3 as practical.
9. Confirm finish queue, payouts and saved credits.
10. Confirm no browser-console errors.

NEXT ROADMAP TASK
8.5 - Overview and Course Preview Visual Polish
