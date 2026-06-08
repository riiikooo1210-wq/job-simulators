# Action asset prompts — Restaurant owner
_Slug: `restaurant-owner-none-franchise-quick-service-franchise-operation-mid-level-owner-operator` · 1 physical/action scene(s)_

Use this file for generated assets that make action scenes feel like real work, not generic buttons. Backgrounds can be full 16:9 illustrations. Interactive objects should usually be transparent-background PNGs. Readable surfaces must include the exact visible text/numbers the player is supposed to inspect.

These are prompts for the user to generate image files. The workflow does not code or synthesize these popup/closeup assets for you. For observation tasks, generate the visual/dialogue evidence the player should inspect, not answer captions or completed documentation.

---

## scene_03_line_check
Scene title: Pre-Rush Line Check
Simulated action: Perform a pre-rush line check for food safety, labeling, prep readiness, and service bottlenecks.

Asset contract:
- Backgrounds show the workplace and stable fixtures only.
- Transparent PNGs represent movable/usable objects the player can select, drag, place, attach, connect, consume, or dispose.
- Readable closeups must be large enough for the player to inspect evidence; do not hide required text in the background.
- State variants show the visible result after work is done: placed, attached, connected, packed, submitted, discarded, fixed, cleaned, or started.
- Do not include answer captions, checkmarks, conclusions, or completed documentation unless the real object genuinely contains that text.

Physical work design notes:
- Real workflow script: Walk to the prep line, read the hot-hold and cold-well labels, check temperatures against the visible standard, verify sanitizer and utensil readiness, glance at the service timer, then record corrective observations for the shift lead and manager.
- Evidence: Hot chicken pan label and temperature display, Cold salsa pan label and temperature display, Sanitizer bucket change-time label, Drive-thru timer reading, Manager log reminder about late line check
- Objects: hot chicken pan, salsa pan, sanitizer bucket, thermometer display, drive-thru timer
- Targets: line-check observation note, corrective action follow-up
- Procedure: Inspect the hot chicken pan, Inspect the cold salsa pan, Inspect sanitizer readiness, Read the drive-thru timer, Record observations
- State changes: Observed surfaces are marked reviewed, Corrective observations are captured for grading

### public/scenes/scene_03_line_check.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
Draw a realistic illustrated quick-service prep line before lunch with cold wells, hot-hold unit, sanitizer bucket, prep labels, and drive-thru timer. Leave clear readable zones matching the coordinate map.

Style:
Generate an illustration in the EXACT same art style as the attached reference image. The style is a clean editorial 2D illustration — hand-drawn digital art with confident ink linework, fully flat cel-shaded color, and very subtle paper-grain texture. Think polished startup pitch deck, modern editorial article, or refined animation storyboard: professional, calm, optimistic, warm, and human-centered. It is NOT a cartoon, NOT photorealistic, NOT anime, NOT 3D rendered, NOT watercolor, NOT pixel art, and NOT a flat icon-style vector.

Anchor the illustration in this tight color palette (these few colors should dominate the entire composition):
- warm cream #EFE8D2
- warm beige/tan #CDBF94
- muted sage green #5F7F62
- dark teal green #3F605C
- muted terracotta red #C75448
- dark charcoal #1E1E1A — used for outlines instead of pure black

The palette is muted, warm, and slightly desaturated, as if every color has been mixed with a touch of beige or gray.

A small number of additional colors are allowed as accents when the scene genuinely calls for them (UI screens, branded products, food, signage, outdoor elements, etc.), but they must feel at home next to the palette above — muted, earthy, never neon or fully saturated. Avoid pure white (except small paper highlights) and avoid pure black (use the dark charcoal above instead).

CRITICAL — flat coloring (this is the most important rule):
- Every object/surface gets ONE solid flat base color, plus AT MOST one darker shadow shape — nothing more
- Absolutely NO gradients, NO color blending, NO hue shifts within a single object, NO soft tonal transitions, NO airbrushing
- Two adjacent areas of different color must be separated by a charcoal outline, never by a gradient
- Do not stack multiple shades of the same hue on one object to fake depth — use the outline + one shadow shape and stop there
- No highlights, glows, lens flares, bloom, ambient occlusion, or rendered lighting effects. The only exception: a small flat-shape highlight on glass/screen/metal is OK, but it must be a single solid shape, never a gradient

Camera perspective: first-person point of view — the viewer IS the player. Do NOT depict the player character's face, head, or full body anywhere in the frame. Body parts visible from your own perspective are fine and encouraged when they help ground the scene (hands holding a phone or pen, arms typing on a keyboard, a lap with a notebook, legs/feet under a desk, a coffee mug being held). NPCs and other people should be visible normally as the player would see them.

Player POV body-part continuity: whenever visible hands, forearms, knees, legs, or feet belong to the viewer/player, use the same consistent medium warm beige/tan skin tone across every image, similar to a medium East Asian/Japanese complexion. Use a flat base tone around #C08F73 with a single darker shadow shape around #8A5F4C. Do NOT make the player hands porcelain-pale, pink/rosy, very dark, or randomly different from scene to scene. This rule applies only to first-person player body parts; NPC skin tones should follow their own locked character appearances.

Linework:
- Thin-to-medium dark charcoal outlines — NOT heavy pure black
- Smooth confident digital ink with slight organic thickness variation (hand-drawn feel, not mechanical)
- Slightly thicker outlines on foreground people and key objects; thinner, lighter outlines on background walls and distant elements
- Clean — no sketchy construction lines, no cross-hatching, no painterly brush strokes

Shading:
- Soft cel-shading: flat base color + one large simple shadow shape per object, and that's it
- Shadows are a darker version of the base color, not pure gray or black
- Faces have very minimal shading — at most one small soft shadow shape under the jaw/neck or beside the nose; do NOT render skin tones with multiple gradient tones

Texture:
- Subtle paper-grain / soft printed feel, barely noticeable — just enough to keep the image from looking sterile or purely vector
- No heavy noise, no watercolor bleed, no canvas texture, no visible brush strokes
- No dotted halftone

Character design (for any visible NPCs and other people in the frame):
- Semi-realistic adult proportions, slightly simplified — NOT cartoonish, NOT anime
- Heads a touch larger than realistic, but only a touch
- Almond-shaped eyes, simple dark eyebrows, small but defined nose, clean lips
- Hair as clear flat shapes with one or two darker internal shadow shapes max; no individual-strand realism, no gradient highlights
- Hands simplified but clearly drawn, slightly elongated and elegant, confidently outlined
- Skin: a single flat skin tone per character + at most one darker shadow shape; never multi-tone gradient skin
- Clothing: simple folds, muted colors, outlined collars/cuffs/seams, no fabric texture, no gradient shading on fabric

Composition:
- Clear foreground / midground / background depth
- Foreground objects often partially visible at the frame edge to draw the viewer in
- Clear focal point; cinematic and narrative-driven, not stiffly posed
- Naturalistic but FLAT lighting — soft shadows expressed only as flat shadow shapes; no harsh dramatic contrast, no rim lights, no glossy reflections, no photorealistic global illumination, no noir spotlighting

Aspect ratio: 16:9 (1920x1080 recommended).

Treat the listed palette as the dominant set; any extra colors must match its vibe. When in doubt, use fewer colors and flatter shading, not more.


### public/action-assets/scene_03_line_check/hot_chicken_closeup.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
Readable closeup of a hot-hold pan label for grilled chicken showing pulled 10:05, discard 2:05, and a temperature display reading 131 F. Do not add answer captions, checkmarks, warning labels, conclusions, or completed notes.

Style:
Generate an illustration in the EXACT same art style as the attached reference image. The style is a clean editorial 2D illustration — hand-drawn digital art with confident ink linework, fully flat cel-shaded color, and very subtle paper-grain texture. Think polished startup pitch deck, modern editorial article, or refined animation storyboard: professional, calm, optimistic, warm, and human-centered. It is NOT a cartoon, NOT photorealistic, NOT anime, NOT 3D rendered, NOT watercolor, NOT pixel art, and NOT a flat icon-style vector.

Anchor the illustration in this tight color palette (these few colors should dominate the entire composition):
- warm cream #EFE8D2
- warm beige/tan #CDBF94
- muted sage green #5F7F62
- dark teal green #3F605C
- muted terracotta red #C75448
- dark charcoal #1E1E1A — used for outlines instead of pure black

The palette is muted, warm, and slightly desaturated, as if every color has been mixed with a touch of beige or gray.

A small number of additional colors are allowed as accents when the scene genuinely calls for them (UI screens, branded products, food, signage, outdoor elements, etc.), but they must feel at home next to the palette above — muted, earthy, never neon or fully saturated. Avoid pure white (except small paper highlights) and avoid pure black (use the dark charcoal above instead).

CRITICAL — flat coloring (this is the most important rule):
- Every object/surface gets ONE solid flat base color, plus AT MOST one darker shadow shape — nothing more
- Absolutely NO gradients, NO color blending, NO hue shifts within a single object, NO soft tonal transitions, NO airbrushing
- Two adjacent areas of different color must be separated by a charcoal outline, never by a gradient
- Do not stack multiple shades of the same hue on one object to fake depth — use the outline + one shadow shape and stop there
- No highlights, glows, lens flares, bloom, ambient occlusion, or rendered lighting effects. The only exception: a small flat-shape highlight on glass/screen/metal is OK, but it must be a single solid shape, never a gradient

Camera perspective: first-person point of view — the viewer IS the player. Do NOT depict the player character's face, head, or full body anywhere in the frame. Body parts visible from your own perspective are fine and encouraged when they help ground the scene (hands holding a phone or pen, arms typing on a keyboard, a lap with a notebook, legs/feet under a desk, a coffee mug being held). NPCs and other people should be visible normally as the player would see them.

Player POV body-part continuity: whenever visible hands, forearms, knees, legs, or feet belong to the viewer/player, use the same consistent medium warm beige/tan skin tone across every image, similar to a medium East Asian/Japanese complexion. Use a flat base tone around #C08F73 with a single darker shadow shape around #8A5F4C. Do NOT make the player hands porcelain-pale, pink/rosy, very dark, or randomly different from scene to scene. This rule applies only to first-person player body parts; NPC skin tones should follow their own locked character appearances.

Linework:
- Thin-to-medium dark charcoal outlines — NOT heavy pure black
- Smooth confident digital ink with slight organic thickness variation (hand-drawn feel, not mechanical)
- Slightly thicker outlines on foreground people and key objects; thinner, lighter outlines on background walls and distant elements
- Clean — no sketchy construction lines, no cross-hatching, no painterly brush strokes

Shading:
- Soft cel-shading: flat base color + one large simple shadow shape per object, and that's it
- Shadows are a darker version of the base color, not pure gray or black
- Faces have very minimal shading — at most one small soft shadow shape under the jaw/neck or beside the nose; do NOT render skin tones with multiple gradient tones

Texture:
- Subtle paper-grain / soft printed feel, barely noticeable — just enough to keep the image from looking sterile or purely vector
- No heavy noise, no watercolor bleed, no canvas texture, no visible brush strokes
- No dotted halftone

Character design (for any visible NPCs and other people in the frame):
- Semi-realistic adult proportions, slightly simplified — NOT cartoonish, NOT anime
- Heads a touch larger than realistic, but only a touch
- Almond-shaped eyes, simple dark eyebrows, small but defined nose, clean lips
- Hair as clear flat shapes with one or two darker internal shadow shapes max; no individual-strand realism, no gradient highlights
- Hands simplified but clearly drawn, slightly elongated and elegant, confidently outlined
- Skin: a single flat skin tone per character + at most one darker shadow shape; never multi-tone gradient skin
- Clothing: simple folds, muted colors, outlined collars/cuffs/seams, no fabric texture, no gradient shading on fabric

Composition:
- Clear foreground / midground / background depth
- Foreground objects often partially visible at the frame edge to draw the viewer in
- Clear focal point; cinematic and narrative-driven, not stiffly posed
- Naturalistic but FLAT lighting — soft shadows expressed only as flat shadow shapes; no harsh dramatic contrast, no rim lights, no glossy reflections, no photorealistic global illumination, no noir spotlighting

Aspect ratio: 16:9 (1920x1080 recommended).

Treat the listed palette as the dominant set; any extra colors must match its vibe. When in doubt, use fewer colors and flatter shading, not more.

### public/action-assets/scene_03_line_check/salsa_closeup.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
Readable closeup of a cold salsa pan label showing prepped 8:15, discard 4:15, and cold well 39 F. Do not add answer captions.

Style:
Generate an illustration in the EXACT same art style as the attached reference image. The style is a clean editorial 2D illustration — hand-drawn digital art with confident ink linework, fully flat cel-shaded color, and very subtle paper-grain texture. Think polished startup pitch deck, modern editorial article, or refined animation storyboard: professional, calm, optimistic, warm, and human-centered. It is NOT a cartoon, NOT photorealistic, NOT anime, NOT 3D rendered, NOT watercolor, NOT pixel art, and NOT a flat icon-style vector.

Anchor the illustration in this tight color palette (these few colors should dominate the entire composition):
- warm cream #EFE8D2
- warm beige/tan #CDBF94
- muted sage green #5F7F62
- dark teal green #3F605C
- muted terracotta red #C75448
- dark charcoal #1E1E1A — used for outlines instead of pure black

The palette is muted, warm, and slightly desaturated, as if every color has been mixed with a touch of beige or gray.

A small number of additional colors are allowed as accents when the scene genuinely calls for them (UI screens, branded products, food, signage, outdoor elements, etc.), but they must feel at home next to the palette above — muted, earthy, never neon or fully saturated. Avoid pure white (except small paper highlights) and avoid pure black (use the dark charcoal above instead).

CRITICAL — flat coloring (this is the most important rule):
- Every object/surface gets ONE solid flat base color, plus AT MOST one darker shadow shape — nothing more
- Absolutely NO gradients, NO color blending, NO hue shifts within a single object, NO soft tonal transitions, NO airbrushing
- Two adjacent areas of different color must be separated by a charcoal outline, never by a gradient
- Do not stack multiple shades of the same hue on one object to fake depth — use the outline + one shadow shape and stop there
- No highlights, glows, lens flares, bloom, ambient occlusion, or rendered lighting effects. The only exception: a small flat-shape highlight on glass/screen/metal is OK, but it must be a single solid shape, never a gradient

Camera perspective: first-person point of view — the viewer IS the player. Do NOT depict the player character's face, head, or full body anywhere in the frame. Body parts visible from your own perspective are fine and encouraged when they help ground the scene (hands holding a phone or pen, arms typing on a keyboard, a lap with a notebook, legs/feet under a desk, a coffee mug being held). NPCs and other people should be visible normally as the player would see them.

Player POV body-part continuity: whenever visible hands, forearms, knees, legs, or feet belong to the viewer/player, use the same consistent medium warm beige/tan skin tone across every image, similar to a medium East Asian/Japanese complexion. Use a flat base tone around #C08F73 with a single darker shadow shape around #8A5F4C. Do NOT make the player hands porcelain-pale, pink/rosy, very dark, or randomly different from scene to scene. This rule applies only to first-person player body parts; NPC skin tones should follow their own locked character appearances.

Linework:
- Thin-to-medium dark charcoal outlines — NOT heavy pure black
- Smooth confident digital ink with slight organic thickness variation (hand-drawn feel, not mechanical)
- Slightly thicker outlines on foreground people and key objects; thinner, lighter outlines on background walls and distant elements
- Clean — no sketchy construction lines, no cross-hatching, no painterly brush strokes

Shading:
- Soft cel-shading: flat base color + one large simple shadow shape per object, and that's it
- Shadows are a darker version of the base color, not pure gray or black
- Faces have very minimal shading — at most one small soft shadow shape under the jaw/neck or beside the nose; do NOT render skin tones with multiple gradient tones

Texture:
- Subtle paper-grain / soft printed feel, barely noticeable — just enough to keep the image from looking sterile or purely vector
- No heavy noise, no watercolor bleed, no canvas texture, no visible brush strokes
- No dotted halftone

Character design (for any visible NPCs and other people in the frame):
- Semi-realistic adult proportions, slightly simplified — NOT cartoonish, NOT anime
- Heads a touch larger than realistic, but only a touch
- Almond-shaped eyes, simple dark eyebrows, small but defined nose, clean lips
- Hair as clear flat shapes with one or two darker internal shadow shapes max; no individual-strand realism, no gradient highlights
- Hands simplified but clearly drawn, slightly elongated and elegant, confidently outlined
- Skin: a single flat skin tone per character + at most one darker shadow shape; never multi-tone gradient skin
- Clothing: simple folds, muted colors, outlined collars/cuffs/seams, no fabric texture, no gradient shading on fabric

Composition:
- Clear foreground / midground / background depth
- Foreground objects often partially visible at the frame edge to draw the viewer in
- Clear focal point; cinematic and narrative-driven, not stiffly posed
- Naturalistic but FLAT lighting — soft shadows expressed only as flat shadow shapes; no harsh dramatic contrast, no rim lights, no glossy reflections, no photorealistic global illumination, no noir spotlighting

Aspect ratio: 16:9 (1920x1080 recommended).

Treat the listed palette as the dominant set; any extra colors must match its vibe. When in doubt, use fewer colors and flatter shading, not more.

### public/action-assets/scene_03_line_check/sanitizer_closeup.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
Readable closeup of a sanitizer bucket with a small label reading last changed 8:30 and replace every 2 hours. Do not show a test strip. Do not add answer captions.

Style:
Generate an illustration in the EXACT same art style as the attached reference image. The style is a clean editorial 2D illustration — hand-drawn digital art with confident ink linework, fully flat cel-shaded color, and very subtle paper-grain texture. Think polished startup pitch deck, modern editorial article, or refined animation storyboard: professional, calm, optimistic, warm, and human-centered. It is NOT a cartoon, NOT photorealistic, NOT anime, NOT 3D rendered, NOT watercolor, NOT pixel art, and NOT a flat icon-style vector.

Anchor the illustration in this tight color palette (these few colors should dominate the entire composition):
- warm cream #EFE8D2
- warm beige/tan #CDBF94
- muted sage green #5F7F62
- dark teal green #3F605C
- muted terracotta red #C75448
- dark charcoal #1E1E1A — used for outlines instead of pure black

The palette is muted, warm, and slightly desaturated, as if every color has been mixed with a touch of beige or gray.

A small number of additional colors are allowed as accents when the scene genuinely calls for them (UI screens, branded products, food, signage, outdoor elements, etc.), but they must feel at home next to the palette above — muted, earthy, never neon or fully saturated. Avoid pure white (except small paper highlights) and avoid pure black (use the dark charcoal above instead).

CRITICAL — flat coloring (this is the most important rule):
- Every object/surface gets ONE solid flat base color, plus AT MOST one darker shadow shape — nothing more
- Absolutely NO gradients, NO color blending, NO hue shifts within a single object, NO soft tonal transitions, NO airbrushing
- Two adjacent areas of different color must be separated by a charcoal outline, never by a gradient
- Do not stack multiple shades of the same hue on one object to fake depth — use the outline + one shadow shape and stop there
- No highlights, glows, lens flares, bloom, ambient occlusion, or rendered lighting effects. The only exception: a small flat-shape highlight on glass/screen/metal is OK, but it must be a single solid shape, never a gradient

Camera perspective: first-person point of view — the viewer IS the player. Do NOT depict the player character's face, head, or full body anywhere in the frame. Body parts visible from your own perspective are fine and encouraged when they help ground the scene (hands holding a phone or pen, arms typing on a keyboard, a lap with a notebook, legs/feet under a desk, a coffee mug being held). NPCs and other people should be visible normally as the player would see them.

Player POV body-part continuity: whenever visible hands, forearms, knees, legs, or feet belong to the viewer/player, use the same consistent medium warm beige/tan skin tone across every image, similar to a medium East Asian/Japanese complexion. Use a flat base tone around #C08F73 with a single darker shadow shape around #8A5F4C. Do NOT make the player hands porcelain-pale, pink/rosy, very dark, or randomly different from scene to scene. This rule applies only to first-person player body parts; NPC skin tones should follow their own locked character appearances.

Linework:
- Thin-to-medium dark charcoal outlines — NOT heavy pure black
- Smooth confident digital ink with slight organic thickness variation (hand-drawn feel, not mechanical)
- Slightly thicker outlines on foreground people and key objects; thinner, lighter outlines on background walls and distant elements
- Clean — no sketchy construction lines, no cross-hatching, no painterly brush strokes

Shading:
- Soft cel-shading: flat base color + one large simple shadow shape per object, and that's it
- Shadows are a darker version of the base color, not pure gray or black
- Faces have very minimal shading — at most one small soft shadow shape under the jaw/neck or beside the nose; do NOT render skin tones with multiple gradient tones

Texture:
- Subtle paper-grain / soft printed feel, barely noticeable — just enough to keep the image from looking sterile or purely vector
- No heavy noise, no watercolor bleed, no canvas texture, no visible brush strokes
- No dotted halftone

Character design (for any visible NPCs and other people in the frame):
- Semi-realistic adult proportions, slightly simplified — NOT cartoonish, NOT anime
- Heads a touch larger than realistic, but only a touch
- Almond-shaped eyes, simple dark eyebrows, small but defined nose, clean lips
- Hair as clear flat shapes with one or two darker internal shadow shapes max; no individual-strand realism, no gradient highlights
- Hands simplified but clearly drawn, slightly elongated and elegant, confidently outlined
- Skin: a single flat skin tone per character + at most one darker shadow shape; never multi-tone gradient skin
- Clothing: simple folds, muted colors, outlined collars/cuffs/seams, no fabric texture, no gradient shading on fabric

Composition:
- Clear foreground / midground / background depth
- Foreground objects often partially visible at the frame edge to draw the viewer in
- Clear focal point; cinematic and narrative-driven, not stiffly posed
- Naturalistic but FLAT lighting — soft shadows expressed only as flat shadow shapes; no harsh dramatic contrast, no rim lights, no glossy reflections, no photorealistic global illumination, no noir spotlighting

Aspect ratio: 16:9 (1920x1080 recommended).

Treat the listed palette as the dominant set; any extra colors must match its vibe. When in doubt, use fewer colors and flatter shading, not more.

### public/action-assets/scene_03_line_check/drive_timer_closeup.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
Readable closeup of a quick-service drive-thru timer screen showing Current average 4:07, target 3:45, and longest car 5:12. Do not add answer captions, checkmarks, warning labels, conclusions, or completed notes.

Style:
Generate an illustration in the EXACT same art style as the attached reference image. The style is a clean editorial 2D illustration — hand-drawn digital art with confident ink linework, fully flat cel-shaded color, and very subtle paper-grain texture. Think polished startup pitch deck, modern editorial article, or refined animation storyboard: professional, calm, optimistic, warm, and human-centered. It is NOT a cartoon, NOT photorealistic, NOT anime, NOT 3D rendered, NOT watercolor, NOT pixel art, and NOT a flat icon-style vector.

Anchor the illustration in this tight color palette (these few colors should dominate the entire composition):
- warm cream #EFE8D2
- warm beige/tan #CDBF94
- muted sage green #5F7F62
- dark teal green #3F605C
- muted terracotta red #C75448
- dark charcoal #1E1E1A — used for outlines instead of pure black

The palette is muted, warm, and slightly desaturated, as if every color has been mixed with a touch of beige or gray.

A small number of additional colors are allowed as accents when the scene genuinely calls for them (UI screens, branded products, food, signage, outdoor elements, etc.), but they must feel at home next to the palette above — muted, earthy, never neon or fully saturated. Avoid pure white (except small paper highlights) and avoid pure black (use the dark charcoal above instead).

CRITICAL — flat coloring (this is the most important rule):
- Every object/surface gets ONE solid flat base color, plus AT MOST one darker shadow shape — nothing more
- Absolutely NO gradients, NO color blending, NO hue shifts within a single object, NO soft tonal transitions, NO airbrushing
- Two adjacent areas of different color must be separated by a charcoal outline, never by a gradient
- Do not stack multiple shades of the same hue on one object to fake depth — use the outline + one shadow shape and stop there
- No highlights, glows, lens flares, bloom, ambient occlusion, or rendered lighting effects. The only exception: a small flat-shape highlight on glass/screen/metal is OK, but it must be a single solid shape, never a gradient

Camera perspective: first-person point of view — the viewer IS the player. Do NOT depict the player character's face, head, or full body anywhere in the frame. Body parts visible from your own perspective are fine and encouraged when they help ground the scene (hands holding a phone or pen, arms typing on a keyboard, a lap with a notebook, legs/feet under a desk, a coffee mug being held). NPCs and other people should be visible normally as the player would see them.

Player POV body-part continuity: whenever visible hands, forearms, knees, legs, or feet belong to the viewer/player, use the same consistent medium warm beige/tan skin tone across every image, similar to a medium East Asian/Japanese complexion. Use a flat base tone around #C08F73 with a single darker shadow shape around #8A5F4C. Do NOT make the player hands porcelain-pale, pink/rosy, very dark, or randomly different from scene to scene. This rule applies only to first-person player body parts; NPC skin tones should follow their own locked character appearances.

Linework:
- Thin-to-medium dark charcoal outlines — NOT heavy pure black
- Smooth confident digital ink with slight organic thickness variation (hand-drawn feel, not mechanical)
- Slightly thicker outlines on foreground people and key objects; thinner, lighter outlines on background walls and distant elements
- Clean — no sketchy construction lines, no cross-hatching, no painterly brush strokes

Shading:
- Soft cel-shading: flat base color + one large simple shadow shape per object, and that's it
- Shadows are a darker version of the base color, not pure gray or black
- Faces have very minimal shading — at most one small soft shadow shape under the jaw/neck or beside the nose; do NOT render skin tones with multiple gradient tones

Texture:
- Subtle paper-grain / soft printed feel, barely noticeable — just enough to keep the image from looking sterile or purely vector
- No heavy noise, no watercolor bleed, no canvas texture, no visible brush strokes
- No dotted halftone

Character design (for any visible NPCs and other people in the frame):
- Semi-realistic adult proportions, slightly simplified — NOT cartoonish, NOT anime
- Heads a touch larger than realistic, but only a touch
- Almond-shaped eyes, simple dark eyebrows, small but defined nose, clean lips
- Hair as clear flat shapes with one or two darker internal shadow shapes max; no individual-strand realism, no gradient highlights
- Hands simplified but clearly drawn, slightly elongated and elegant, confidently outlined
- Skin: a single flat skin tone per character + at most one darker shadow shape; never multi-tone gradient skin
- Clothing: simple folds, muted colors, outlined collars/cuffs/seams, no fabric texture, no gradient shading on fabric

Composition:
- Clear foreground / midground / background depth
- Foreground objects often partially visible at the frame edge to draw the viewer in
- Clear focal point; cinematic and narrative-driven, not stiffly posed
- Naturalistic but FLAT lighting — soft shadows expressed only as flat shadow shapes; no harsh dramatic contrast, no rim lights, no glossy reflections, no photorealistic global illumination, no noir spotlighting

Aspect ratio: 16:9 (1920x1080 recommended).

Treat the listed palette as the dominant set; any extra colors must match its vibe. When in doubt, use fewer colors and flatter shading, not more.


---
