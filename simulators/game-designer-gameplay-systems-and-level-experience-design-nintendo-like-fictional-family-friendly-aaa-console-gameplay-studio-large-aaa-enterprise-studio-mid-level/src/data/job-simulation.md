# Game Designer - Starling Grove Studios Simulation

## Company Profile

Starling Grove Studios is a fictional large AAA console studio making polished, family-friendly action-adventure games with playful mechanics, expressive characters, and long production cycles. The studio hires game designers to define mechanics, missions, challenges, documentation, prototypes, test plans, and cross-discipline communication so artists, engineers, audio, QA, and production can build the same intended experience [onet][src:door_problem][src:riot_agile].

The current project is **Sproutbound**, a fictional cooperative console adventure where small forest guardians use wind, water, and plant abilities to move through compact puzzle-platforming levels. You are on the Moment-to-Moment Design team, responsible for making a new "Wind Bud" traversal mechanic readable, surprising, and buildable within a short milestone; the job focus mirrors source-described work in mechanic design, level challenges, blockouts, documentation, testing, and cross-team coordination [onet][src:level_blockout][src:level_playtesting].

## The Protagonist (You)

You are a mid-level Game Designer, six months into Starling Grove after shipping smaller content at another studio. Your job is not just to have ideas: designers create proposals, specifications, layouts, flowcharts, test plans, and feedback loops that help a large team implement the intended game [onet][yt:K64hbcUbslE][src:gamedev_gdd]. You report to the Lead Gameplay Designer and collaborate daily with level design, gameplay engineering, art, production, and QA because game design work depends heavily on meetings, written communication, testing, and iteration [onet][yt:RS9ec8SV77w][yt:ZEoyoXUoIX8][src:riot_agile].

## Cast

- **Maya Chen, Lead Gameplay Designer** - calm, precise, player-advocate; she wants a mechanic that teaches itself before it becomes hard.
- **Leo Navarro, Senior Level Designer** - playful and fast with blockouts; he cares about pacing, camera readable silhouettes, and where the player looks first.
- **Priya Raman, Gameplay Engineer** - practical, kind, constraint-oriented; she wants a clear state list, edge cases, and a small enough change to land safely.
- **Emi Tanaka, Producer** - warm but schedule-aware; she protects milestone scope and asks designers to translate ambiguity into a decision.
- **Owen Brooks, QA Lead** - direct, observant, dryly funny; he brings evidence from playtests and wants notes that QA can verify.

## The Day

### 1. Morning Briefing - 9:15 AM
The morning recap shows that players like the Wind Bud toy but often miss the first safe use, overshoot a platform, or ask whether the bud is a jump pad or a wind tunnel. Game designers routinely balance and adjust gameplay, devise challenges, create documentation, and use test feedback to preserve the intended experience [onet][src:level_playtesting]. The scene gives you Maya's verbal recap, then the Teaching Note workspace keeps the debugging notes and playtest numbers together while you act [src:riot_agile].

Interaction mode: briefing with visible source artifacts. Good performance means absorbing constraints before proposing work [src:gitbook_gdd].

### 2. Wind Bud Teaching Note
You inspect a small playable Wind Bud level slice and make one focused teaching note from fixed options: which room part to improve, which small change to try, which success sign proves it helped, and which confusion sign the playtest should watch. Designers often start with quick diagrams before building, because planning is cheap and helps avoid wasting implementation time [yt:c0o6BPYKBiA][yt:ZEoyoXUoIX8][src:gamedev_gdd].

Interaction mode: visual tutorial note with bounded structured fields. Visible input artifacts: mechanic brief, player pain points, milestone constraints, and a playable mini level slice. Work surface: annotated design board. Output artifact: Wind Bud teaching note. Good performance chooses one useful area, one readable cue, one success sign, and one confusion sign that the fixed playtest can actually show [onet][yt:ZEoyoXUoIX8][src:door_problem].

### 3. Wind Bud Playtest Watchlist
Maya asks you to turn the Teaching Note into a short observer watchlist for the 4 PM playtest. The watchlist uses fixed observable signal choices so the next playtest can handle the student's earlier note instead of trying to interpret unrelated open-ended text. Designers must test, gather opinions, iterate, and keep balancing until the game improves, but useful playtests depend on concrete signals rather than vague reactions [yt:ZEoyoXUoIX8][src:level_playtesting][src:riot_prototype].

Interaction mode: bounded structured watchlist. Visible input artifacts: Teaching Note, player pain points, and playtest goal. Work surface: Google Docs-style observer document. Output artifact: Wind Bud playtest watchlist. Good performance selects observable behavior, success/failure signals, and noise that should not be counted as proof, all from the fixed playtest-compatible set [src:level_playtesting][src:riot_prototype].

### 4. Run the Playtest
You observe three first-time players run the Wind Bud room against your watchlist. Designers must test, gather opinions, iterate, and keep balancing until the game improves, but the important part is watching what players actually do rather than defending the intended fix [yt:ZEoyoXUoIX8][src:level_playtesting][src:riot_prototype]. The team also does full-team play sessions and writes bugs when freezes or problems appear near release [yt:K64hbcUbslE].

Interaction mode: visual playtest timeline plus live observation log and fix-priority ranking. Visible input artifacts: your watchlist and moment-by-moment tester behavior. Work surface: playtest lab monitor with one conclusion-with-evidence note per tester plus a priority justification box. Output artifact: Run the Playtest observation log and prioritized fix rationale. Good performance connects observed behavior to success/confusion/noise, ranks fixes by evidence, and separates core comprehension blockers from lower-impact backlog or noise [src:level_playtesting][src:riot_prototype].

### 5. Spec Update
You write a concise implementation email for Priya, Leo, Owen, and Emi. O*NET lists formal design documentation, mockups, flowcharts, production schedules, test goals, and QA specifications as part of video game designer work [onet]. Real designers describe spending substantial time on documents, presentations, design docs, spreadsheets, and feedback between meetings [yt:RS9ec8SV77w][yt:ZEoyoXUoIX8][src:gitbook_gdd][src:gamedev_gdd].

Interaction mode: email compose. Visible input artifacts: teaching note, watchlist, playtest evidence, and team needs. Work surface: email draft. Output artifact: implementation spec update email. Good performance states the player problem, proposed change, acceptance criteria, risks, and test notes without over-prescribing engineering details [src:door_problem][src:riot_tools].

### 6. Engineering Handoff Prep
Before the implementation conversation, you prepare for the implementation gaps Priya is most likely to ask about after reading your spec email and priority ranking. Game planners/designers need strong management and communication skills because they coordinate with specialists and translate ideas into proposals and specifications [yt:K64hbcUbslE][src:door_problem]. Designers also communicate concepts to technical colleagues and provide test specifications [onet].

Interaction mode: optional typed prep note. Visible input artifacts: the player's priority ranking and an adaptive engineering agenda. Work surface: doc. Output artifact: optional prep note that remains visible in the later voice meeting if the student writes one. Good performance in the later meeting fills the most important gaps left by the student's own email: player-facing behavior, relevant edge cases or tuning rules, QA checks, and which details are design intent versus engineering choice [onet][yt:K64hbcUbslE][src:riot_agile].

### 7. Engineering Handoff with Priya
You speak with Priya in a studio huddle room. Face-to-face team discussions and communication with peers are frequent in the O*NET work context, and day-in-the-life sources show game planners spending much of the day in meetings with level, effects, costume, battle, and project teams [onet][yt:K64hbcUbslE][yt:M6hf4Ll_WkE][src:riot_agile].

Interaction mode: in-person voice meeting with typed fallback. Visible input artifacts: your optional prep note and a compact engineering reference card. Output artifact: transcript for grading. Good performance answers Priya's questions about the implementation gaps created by the student's actual spec email and priority ranking, including relevant edge cases, tuning or reset rules, QA criteria, and the boundary between design intent and implementation choice [onet][yt:M6hf4Ll_WkE][src:riot_agile].

### 8. Day Complete
The simulated day wraps after the engineering handoff. The next screen is the simulator's assessment gate.

## Work-Mix Design

- **Digital tool/artifact work: dominant.** The role centers on design documents, flowcharts, spreadsheets, editor/blockout thinking, prototypes, and tool-supported communication [onet][yt:c0o6BPYKBiA][yt:ZEoyoXUoIX8][src:level_blockout][src:riot_tools].
- **Cognitive analysis/decision-making: major.** The designer must identify player problems, define testable signals, choose the right follow-up, and balance fun, readability, and resource constraints [onet][yt:ZEoyoXUoIX8][src:door_problem][src:riot_prototype].
- **Written documentation/artifact production: major.** O*NET emphasizes formal design documents, mockups, flowcharts, production goals, and QA specs, and practitioner sources describe documents and presentations as core work [onet][yt:RS9ec8SV77w][yt:ZEoyoXUoIX8][src:gitbook_gdd][src:gamedev_gdd].
- **Spoken/interpersonal communication: major.** Sources show regular meetings, team updates, specialist coordination, presentations, and communication as critical to game design [onet][yt:K64hbcUbslE][yt:M6hf4Ll_WkE][src:riot_agile].
- **Physical/procedural/tool manipulation: rare.** Designers may use controllers, test devices, or editors, but the core work here is digital design manipulation and playtest interpretation rather than physical equipment work [yt:K64hbcUbslE][yt:M6hf4Ll_WkE][yt:c0o6BPYKBiA].
- **Passive monitoring/context switching: secondary.** Meetings, waiting for builds, reviewing others' content, playtest reviews, and switching between solo work and feedback appear throughout the day [yt:RS9ec8SV77w][yt:K64hbcUbslE][src:riot_agile].

## Grading Rubric

The grading table below mirrors `src/data/rubric.json`; prep scenes are not scored directly.

| Scoring Item | Evidence Scene | Scoring Guide |
| :--- | :--- | :--- |
| Mechanic Problem Framing | mechanic_hook_sheet | 9-10: Chooses a room part, buildable change, success sign, and confusion sign that all fit the Wind Bud playtest evidence. Score only this task; do not use later tasks, prep notes, or follow-up artifacts as evidence. 7-8: Covers the main ideas with minor gaps in evidence, specificity, priority, notes, or response quality. 4-6: Partly complete, but several important judgments, checks, explanations, records, or next actions are missing. 0-3: Misses the task goal, ignores evidence, creates unsafe or confusing promises, or chooses signs the playtest cannot observe. |
| Playtest Watchlist | playtest_watchlist | 9-10: Selects observable behavior, success, confusion, and do-not-over-read signals that the fixed tester timeline can actually show. Score only this task; do not use later tasks, prep notes, or follow-up artifacts as evidence. 7-8: Covers the main ideas with minor gaps in evidence, specificity, priority, notes, or response quality. 4-6: Partly complete, but several important judgments, checks, explanations, records, or next actions are missing. 0-3: Misses the task goal, ignores evidence, creates unsafe or confusing promises, or picks signals unrelated to the playtest evidence. |
| Playtest Observation | playtest_workspace | 9-10: Separates observed facts from interpretation and records how player learning, failure, or fun changed during the playtest. Score only this task; do not use later tasks, prep notes, or follow-up artifacts as evidence. 7-8: Covers the main ideas with minor gaps in evidence, specificity, priority, notes, or response quality. 4-6: Partly complete, but several important judgments, checks, explanations, records, or next actions are missing. 0-3: Misses the task goal, ignores evidence, creates unsafe or confusing promises, or is too incomplete to use. |
| Spec Update | spec_update | 9-10: Uses playtest evidence to clearly describe the spec change, kept behavior, implementation notes, open questions, and QA checks. Score only this task; do not use later tasks, prep notes, or follow-up artifacts as evidence. 7-8: Covers the main ideas with minor gaps in evidence, specificity, priority, notes, or response quality. 4-6: Partly complete, but several important judgments, checks, explanations, records, or next actions are missing. 0-3: Misses the task goal, ignores evidence, creates unsafe or confusing promises, or is too incomplete to use. |
| Engineering Handoff | design_review | 9-10: In the actual handoff transcript, not the prep note alone, explains design intent, why the spec changed, implementation constraints, and open decisions to engineering. Score only this task; do not use later tasks, prep notes, or follow-up artifacts as evidence. 7-8: Covers the main ideas with minor gaps in evidence, specificity, priority, notes, or response quality. 4-6: Partly complete, but several important judgments, checks, explanations, records, or next actions are missing. 0-3: Misses the task goal, ignores evidence, creates unsafe or confusing promises, or is too incomplete to use. |
## Glossary

- **Blockout:** A rough, ugly playable version of a level used to test layout and flow before art polish [yt:c0o6BPYKBiA].
- **Hook:** The first clear reason a player wants to try a mechanic [yt:ZEoyoXUoIX8].
- **Affordance:** A visual or audio cue that suggests how an object can be used [onet].
- **Fail-safe:** A design choice that lets players recover after a mistake without frustration [yt:ZEoyoXUoIX8].
- **Acceptance criteria:** Specific conditions that tell the team whether a design change is implemented correctly [onet].
- **Telemetry:** Data from playtests or builds that shows what players did [onet].
- **Milestone:** A scheduled development checkpoint with agreed deliverables [onet][yt:K64hbcUbslE].
- **Triage:** Ranking issues by urgency, impact, and feasibility [onet].

## Source Notes

O*NET informed the formal duties: balancing gameplay, devising challenges, maintaining design docs, creating flowcharts/mockups, coordinating production, presenting concepts, making test plans, and providing QA specifications [onet]. The Japanese game planner videos informed the meeting-heavy cross-functional day, coordination with level/effects/costume/battle teams, full-team play sessions, test devices, and the need for proposals/specifications [yt:K64hbcUbslE][yt:M6hf4Ll_WkE]. The professional day-in-the-life video informed daily meetings, team updates, design presentations, reviewing others' content, and solo design work between meetings [yt:RS9ec8SV77w]. The CG Spectrum explanation informed systems/level design, paper design, documents, spreadsheets, team communication, constraints, playtesting, iteration, and balancing [yt:ZEoyoXUoIX8]. The ConnectEd video informed level editor work, paper planning, blockout, repeated play, and polish [yt:c0o6BPYKBiA]. Alternative public sources replaced Reddit: Liz England's Door Problem article supports cross-discipline mechanic specifications [src:door_problem]; The Level Design Book supports blockout and playtesting details [src:level_blockout][src:level_playtesting]; Riot Games articles support prototypes, agile creative development, playtests, acceptance criteria, and designer tooling [src:riot_prototype][src:riot_agile][src:riot_tools]; GitBook and Game Developer GDD articles support the written design document and handoff scenes [src:gitbook_gdd][src:gamedev_gdd].
