# Action asset prompts — Wedding planner
_Slug: `wedding-planner-general-wedding-planning-most-common-responsibilities-wedding-venue-mid-sized-venue-business-mid-level` · 1 physical/action scene(s)_

Use this file for generated assets that make action scenes feel like real work, not generic buttons. Backgrounds can be full 16:9 illustrations. Interactive objects should usually be transparent-background PNGs. Readable surfaces must include the exact visible text/numbers the player is supposed to inspect.

These are prompts for the user to generate image files. The workflow does not code or synthesize these popup/closeup assets for you. For observation tasks, generate the visual/dialogue evidence the player should inspect, not answer captions or completed documentation.

---

## scene_03_ballroom_setup
Scene title: Inspect the Ballroom Setup
Simulated action: inspect_ballroom_setup_and_correct_guest_flow_items

Asset contract:
- Backgrounds show the workplace and stable fixtures only.
- Transparent PNGs represent movable/usable objects the player can select, drag, place, attach, connect, consume, or dispose.
- Readable closeups must be large enough for the player to inspect evidence; do not hide required text in the background.
- State variants show the visible result after work is done: placed, attached, connected, packed, submitted, discarded, fixed, cleaned, or started.
- Do not include answer captions, checkmarks, conclusions, or completed documentation unless the real object genuinely contains that text.

Physical work design notes:
- Real workflow script: Enter the ballroom, read the final setup sheet, place the card box and guest book on the welcome table, flag that florist bins are blocking the east service aisle and need the florist to move them to the vendor corner, mark that reserved-family signs are missing from the first two ceremony rows, and write a concise setup note for operations.
- Evidence: Final setup sheet says guest book and card box belong on welcome table., Florist bins are blocking the east service aisle., Reserved-family signs are missing from first two ceremony rows.
- Objects: card box, guest book, florist bins, welcome table, vendor corner, first two ceremony rows, final setup sheet, setup note field
- Targets: welcome table, vendor corner, family row seats, setup note field
- Procedure: Open setup sheet closeup, Place card box, Place guest book, Flag florist bins: ask florist to move to vendor corner, Open family-row closeup and write the missing-sign issue, Write setup note
- State changes: Card box remains on welcome table., Guest book remains on welcome table., Florist bins issue is marked with the approved vendor-corner relocation request., Family-row issue remains marked., Setup note is submitted.

### public/scenes/scene_03_ballroom_setup.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
First-person 16:9 view of an elegant mid-sized wedding venue ballroom during final setup with welcome table, side cart, family rows missing reserved signs, DJ booth, cake table, east service aisle blocked by florist bins, and open vendor corner. Include a readable setup sheet area but no answer captions or checkmarks.

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


### public/action-assets/scene_03_ballroom_setup/card_box.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
Transparent PNG of an elegant cream wedding card box with slot, no background, sized for dragging onto a welcome table.

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

### public/action-assets/scene_03_ballroom_setup/guest_book.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
Transparent PNG of an open wedding guest book with pen, no background, sized for dragging onto a welcome table.

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

### public/action-assets/scene_03_ballroom_setup/setup_sheet_closeup.png

USER-SUPPLIED ASSET REQUIRED.

Closeup PNG of the Rivera-Chen final ballroom setup sheet with readable setup rules for guest-flow items, reserved family rows, east service aisle, florist staging, and open-flame policy.

### public/action-assets/scene_03_ballroom_setup/family_rows_missing_signs_closeup.png

USER-SUPPLIED ASSET REQUIRED.

Closeup PNG of the first two ceremony rows showing seats ready for immediate family but no reserved-family signs visible, used as the zoomed inspection surface before the player writes an issue note.

### public/action-assets/scene_03_ballroom_setup/florist_bins_service_aisle_closeup.png

COPY THIS WHOLE ASSET PROMPT.

Asset-specific subject:
Use the uploaded `scene_03_ballroom_setup.png` as the reference image. Generate a zoomed-in closeup of the same east service aisle area in the same elegant wedding ballroom, preserving the room layout, warm cream palette, lighting, and first-person inspection perspective from the reference. Show the florist staging bins with greenery and wrapped stems visibly blocking the east service aisle, with the open vendor corner still partially visible in the background or off to the side as the appropriate relocation destination. The image should make the obstruction and destination spatially understandable, but include no answer captions, no arrows, no checkmarks, and no added instructional text.

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
