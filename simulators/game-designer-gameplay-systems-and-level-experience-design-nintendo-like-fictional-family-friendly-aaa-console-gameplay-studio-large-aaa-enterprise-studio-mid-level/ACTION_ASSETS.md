# Action asset prompts - game designer Wind Bud playtest timeline

Use these prompts for `public/action-assets/playtest_timeline/`.

Current workflow:
- These are fixing prompts for already-generated images, not fresh generation prompts.
- For each image, attach the existing image for that filename and ask the model to edit that image.
- Preserve the existing composition, crop, monitor frame, human tester, game screen, character designs, object positions, colors, linework, and current texture as much as possible.
- Do not try to clean up muddy texture, warmth, or bumpy surfaces in this pass. That can be fixed later with a separate cleanup prompt.
- If the attached image accidentally became only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible monitor frame with a desk, controller, and human tester around it. Do not redraw the game screen from scratch.
- No readable UI text, captions, labels, logos, watermarks, or subtitles inside the image.

---

## tester-a-pauses-safe-start.png

Filename: `public/action-assets/playtest_timeline/tester-a-pauses-safe-start.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Keep the image as a pure 16:9 side-view game screen reference, not a playtest-lab monitor scene. Preserve the existing crop, level layout, object positions, character design, colors, linework, texture, and overall style. Do not fix muddy texture or warm color drift in this pass.

Only correct the moment if needed: the small in-game avatar should be standing still on the safe start platform at the far left, around x 18% y 57%, facing right and hesitating before doing anything. The Wind Bud should remain near x 40% y 50%, the right landing platform should remain in place, and the optional coin trail should stay above/after the landing. No gust is active yet.

Do not change the palette; keep the existing image closest to these target colors: background #EFE8D2, platforms #CDBF94, grass/leaves #5F7F62, dark stems/deep accents #3F605C, Wind Bud flower #C75448, wind/gust shapes #A8C7BE, coins #E8DCC8, avatar cream accents #F2EBD9, outlines #111111 or #1E1E1A.

Do not add readable text, UI, captions, logos, watermarks, extra characters, or a monitor frame.
```

---

## tester-a-looks-coins.png

Filename: `public/action-assets/playtest_timeline/tester-a-looks-coins.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester A should remain a young adult seen from behind, with short dark hair, medium warm beige skin #C08F73, a muted sage hoodie #5F7F62, and cream sleeves #F2EBD9. The human tester should be outside the monitor, looking toward the upper-right coin trail on the screen. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: the avatar should still be on or near the safe start platform around x 30% y 55%, idle and not engaging the Wind Bud. The human tester's attention should read as pulled toward the optional coin trail. Do not move or enlarge the coins. The Wind Bud is visible but not activated. No gust is active yet.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage/tester hoodie #5F7F62, monitor/dark accents #3F605C or #1E1E1A, Wind Bud #C75448, wind cue #A8C7BE, coins #E8DCC8, cream accents #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-a-tutorial-hint.png

Filename: `public/action-assets/playtest_timeline/tester-a-tutorial-hint.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester A should remain a young adult seen from behind, with short dark hair, medium warm beige skin #C08F73, a muted sage hoodie #5F7F62, and cream sleeves #F2EBD9. The human tester should be outside the monitor, watching the hint appear. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: the avatar should be near the left side around x 26% y 55%, still not striking the Wind Bud. Show an on-screen tutorial hint appearing near the Wind Bud: a small cream speech bubble or rectangular hint callout with a short pointer aimed at the Wind Bud. The hint represents automatic in-game guidance after the player hesitates too long. It must contain no readable words, only generic unreadable line marks. The Wind Bud should be visually called out by the hint, while still not being struck. No active gust yet.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage/tester hoodie #5F7F62, monitor/dark accents #3F605C or #1E1E1A, Wind Bud #C75448, tutorial hint bubble #F2EBD9, wind cue #A8C7BE, coins #E8DCC8, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-a-strikes-late.png

Filename: `public/action-assets/playtest_timeline/tester-a-strikes-late.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester A should remain a young adult seen from behind, with short dark hair, medium warm beige skin #C08F73, a muted sage hoodie #5F7F62, and cream sleeves #F2EBD9. The human tester should be outside the monitor, leaning forward with the controller as they finally act. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: the avatar should finally strike the Wind Bud late, positioned near x 40% y 50%, with a clear hit pose toward the flower. A small fading tutorial hint bubble can still be nearby to show the strike happened after automatic guidance appeared, but it must have no readable text. The Wind Bud is just beginning to react; show a small early gust shape forming toward the right, not a full ride yet.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage/tester hoodie #5F7F62, monitor/dark accents #3F605C or #1E1E1A, Wind Bud #C75448, gust #A8C7BE, coins #E8DCC8, cream accents #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-b-notices-bud.png

Filename: `public/action-assets/playtest_timeline/tester-b-notices-bud.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester B should remain a young adult seen from behind, with a cream baseball cap #F2EBD9, medium warm beige skin #C08F73, a deep teal sweatshirt #3F605C, and muted tan sleeves/pants #CDBF94. The human tester should be outside the monitor, focused on the Wind Bud. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: the Tester B in-game avatar should be a compact explorer with a deep teal hoodie #3F605C, cream cap #F2EBD9, muted tan pants #CDBF94, and dark boots #1E1E1A. The avatar stands near the left safe platform around x 28% y 55% and quickly turns toward the Wind Bud. The Wind Bud is visible and readable as an interactable object, but it has not been struck yet. No gust is active.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents/tester sweatshirt #3F605C or #1E1E1A, Wind Bud #C75448, wind cue #A8C7BE, coins #E8DCC8, cream cap #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-b-strikes-quickly.png

Filename: `public/action-assets/playtest_timeline/tester-b-strikes-quickly.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester B should remain a young adult seen from behind, with a cream baseball cap #F2EBD9, medium warm beige skin #C08F73, a deep teal sweatshirt #3F605C, and muted tan sleeves/pants #CDBF94. The human tester should be outside the monitor, leaning forward with the controller as they act quickly. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: keep the Tester B avatar consistent with a deep teal hoodie #3F605C, cream cap #F2EBD9, muted tan pants #CDBF94, and dark boots #1E1E1A. The avatar is at the Wind Bud around x 40% y 50%, striking it quickly without any hint bubble. Show a confident hit pose. The Wind Bud begins opening and a pale blue-green gust shape #A8C7BE starts forming toward the right.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents/tester sweatshirt #3F605C or #1E1E1A, Wind Bud #C75448, gust #A8C7BE, coins #E8DCC8, cream cap #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-b-runs-away-gust.png

Filename: `public/action-assets/playtest_timeline/tester-b-runs-away-gust.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester B should remain a young adult seen from behind, with a cream baseball cap #F2EBD9, medium warm beige skin #C08F73, a deep teal sweatshirt #3F605C, and muted tan sleeves/pants #CDBF94. The human tester should be outside the monitor, tense over the controller as the mistake happens. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: keep the Tester B avatar consistent with a deep teal hoodie #3F605C, cream cap #F2EBD9, muted tan pants #CDBF94, and dark boots #1E1E1A. The gust is active behind the avatar, flowing from the Wind Bud toward the right in pale blue-green #A8C7BE. The avatar is around x 34% y 56%, running away from the gust instead of entering it, body angled back toward the left/safe side with a startled pose.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents/tester sweatshirt #3F605C or #1E1E1A, Wind Bud #C75448, gust #A8C7BE, coins #E8DCC8, cream cap #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-b-falls.png

Filename: `public/action-assets/playtest_timeline/tester-b-falls.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester B should remain a young adult seen from behind, with a cream baseball cap #F2EBD9, medium warm beige skin #C08F73, a deep teal sweatshirt #3F605C, and muted tan sleeves/pants #CDBF94. The human tester should be outside the monitor with the controller lowered slightly, reacting to the fall. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: keep the Tester B avatar consistent with a deep teal hoodie #3F605C, cream cap #F2EBD9, muted tan pants #CDBF94, and dark boots #1E1E1A. The avatar is falling into the gap or lower hazard area around x 52% y 72% after misreading the gust. Show the active gust still flowing across the middle from the Wind Bud toward the right in #A8C7BE, but the avatar is below the intended route, clearly missing the safe landing. Keep the pose readable but not violent.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents/tester sweatshirt #3F605C or #1E1E1A, Wind Bud #C75448, gust #A8C7BE, coins #E8DCC8, cream cap #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-b-retries.png

Filename: `public/action-assets/playtest_timeline/tester-b-retries.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester B should remain a young adult seen from behind, with a cream baseball cap #F2EBD9, medium warm beige skin #C08F73, a deep teal sweatshirt #3F605C, and muted tan sleeves/pants #CDBF94. The human tester should be outside the monitor, refocused on the controller and screen for a retry. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: keep the Tester B avatar consistent with a deep teal hoodie #3F605C, cream cap #F2EBD9, muted tan pants #CDBF94, and dark boots #1E1E1A. The avatar has reset to the safe start platform around x 22% y 57%, facing right and preparing to retry after the fall. The Wind Bud is visible in the same place. No hint bubble. The gust is inactive or fading very subtly; the moment should read as a retry, not a success.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents/tester sweatshirt #3F605C or #1E1E1A, Wind Bud #C75448, wind #A8C7BE, coins #E8DCC8, cream cap #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-c-turns-to-bud.png

Filename: `public/action-assets/playtest_timeline/tester-c-turns-to-bud.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester C should remain a young adult seen from behind, with medium warm beige skin #C08F73, dark hair tied low, a terracotta sweatshirt #C75448, and cream sleeves #F2EBD9. The human tester should be outside the monitor, calmly focused on the Wind Bud. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: the Tester C in-game avatar should be a calm explorer with a terracotta jacket #C75448, muted sage pants #5F7F62, cream sleeves/scarf #F2EBD9, and dark charcoal boots #1E1E1A. The avatar stands near the safe start around x 29% y 55%, clearly turning toward the Wind Bud from the safe side. The pose should read as clean recognition. The Wind Bud is not struck yet, and no gust is active.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents #3F605C or #1E1E1A, tester/avatar terracotta #C75448, wind cue #A8C7BE, coins #E8DCC8, cream accents #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-c-uses-gust-safe-side.png

Filename: `public/action-assets/playtest_timeline/tester-c-uses-gust-safe-side.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester C should remain a young adult seen from behind, with medium warm beige skin #C08F73, dark hair tied low, a terracotta sweatshirt #C75448, and cream sleeves #F2EBD9. The human tester should be outside the monitor, steady on the controller while the move succeeds. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: keep the Tester C avatar consistent with a terracotta jacket #C75448, muted sage pants #5F7F62, cream sleeves/scarf #F2EBD9, and dark charcoal boots #1E1E1A. The avatar has triggered the Wind Bud and is entering or riding the gust from the intended safe side around x 52% y 48%. Show an active gust flowing from the Wind Bud toward the right platform in pale blue-green #A8C7BE. The pose should show cooperation with the gust, not fear or retreat.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents #3F605C or #1E1E1A, tester/avatar terracotta #C75448, gust #A8C7BE, coins #E8DCC8, cream accents #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-c-reaches-landing.png

Filename: `public/action-assets/playtest_timeline/tester-c-reaches-landing.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester C should remain a young adult seen from behind, with medium warm beige skin #C08F73, dark hair tied low, a terracotta sweatshirt #C75448, and cream sleeves #F2EBD9. The human tester should be outside the monitor, relaxed but still holding the controller after the successful landing. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: keep the Tester C avatar consistent with a terracotta jacket #C75448, muted sage pants #5F7F62, cream sleeves/scarf #F2EBD9, and dark charcoal boots #1E1E1A. The avatar has successfully landed on the right platform around x 76% y 44%. The gust can be fading behind them in pale blue-green #A8C7BE, showing that it carried them across. The pose should read as stable and successful. Keep the optional coins in their existing positions.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents #3F605C or #1E1E1A, tester/avatar terracotta #C75448, gust #A8C7BE, coins #E8DCC8, cream accents #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## tester-c-reward-ledge-question.png

Filename: `public/action-assets/playtest_timeline/tester-c-reward-ledge-question.png`

```text
Edit the attached existing image only. Do not redraw it from scratch.

Preserve the existing crop, composition, monitor frame, desk, controller, human tester, game screen, in-game avatar, object positions, colors, linework, texture, and overall style as much as possible. Do not fix muddy texture or warm color drift in this pass.

If the attached image is only a bare game screen, keep that game screen as unchanged as possible and place it inside a visible dark monitor frame with a simple desk and a human playtester seen from behind in the lower foreground, holding a controller. Add only enough surrounding playtest-lab context to make it clear this is someone watching/playing on a monitor.

Human tester C should remain a young adult seen from behind, with medium warm beige skin #C08F73, dark hair tied low, a terracotta sweatshirt #C75448, and cream sleeves #F2EBD9. The human tester should be outside the monitor, tilting their head toward the optional coin trail as if asking whether it is optional. The in-game avatar is a separate small character inside the monitor; do not turn the avatar into the human tester.

Only correct the moment inside the monitor: keep the Tester C avatar consistent with a terracotta jacket #C75448, muted sage pants #5F7F62, cream sleeves/scarf #F2EBD9, and dark charcoal boots #1E1E1A. After reaching the right landing, the avatar stands near x 82% y 43%, while the human tester's attention goes toward the optional coin trail or reward ledge. If a small thought bubble is useful, put it near the human tester outside the monitor, but it must contain no readable words, no punctuation marks, and no UI text. The core gust path should be completed or fading, not the main focus.

Do not recolor the image; keep it closest to these target colors: studio/sky #EFE8D2, desk/platforms #CDBF94, foliage #5F7F62, monitor/dark accents #3F605C or #1E1E1A, tester/avatar terracotta #C75448, gust #A8C7BE, coins #E8DCC8, thought bubble/cream accents #F2EBD9, outlines #111111 or #1E1E1A.

No readable text, UI labels, captions, logos, watermarks, new props, or redesigned characters.
```

---

## Later cleanup prompt for muddy texture / warm drift

Use this later, after the scene content is correct.

```text
Edit the attached image only. Preserve the exact composition, crop, monitor frame, human tester, game screen, character designs, poses, object positions, and all scene content.

Only clean the surface quality and color drift. Reduce muddy/bumpy texture, speckled noise, unwanted warm tint, dirty overlays, watercolor-like patches, and uneven color buildup. Return the image closer to clean flat painting with solid color areas and crisp dark outlines.

Do not redesign anything, do not move anything, do not change poses, do not add or remove objects, and do not introduce readable text.
```
