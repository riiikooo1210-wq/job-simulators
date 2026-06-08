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
The build review packet shows that players like the Wind Bud toy but often miss the first safe use, overshoot a platform, or ask whether the bud is a jump pad or a wind tunnel. Game designers routinely balance and adjust gameplay, devise challenges, create documentation, and use test feedback to preserve the intended experience [onet][src:level_playtesting]. The scene gives you a visible feature brief, Slack updates, and playtest metrics before you act [src:riot_agile].

Interaction mode: briefing with visible source artifacts. Good performance means absorbing constraints before proposing work [src:gitbook_gdd].

### 2. Wind Bud Teaching Note
You annotate a small static Wind Bud level slice and write one focused teaching note: which cue/effect you would add, and what success feedback would prove the rule worked. Designers often start with quick diagrams before building, because planning is cheap and helps avoid wasting implementation time [yt:c0o6BPYKBiA][yt:ZEoyoXUoIX8][src:gamedev_gdd].

Interaction mode: visual tutorial note with structured fields. Visible input artifacts: mechanic brief, player pain points, milestone constraints, and a static mini level slice. Work surface: annotated design board. Output artifact: Wind Bud teaching note. Good performance chooses one useful area, adds a readable attention cue, and describes success feedback that proves a buildable mechanic rule [onet][yt:ZEoyoXUoIX8][src:door_problem].

### 3. Wind Bud Playtest Watchlist
Maya asks you to turn the Teaching Note into a short observer watchlist for the 4 PM playtest. Designers must test, gather opinions, iterate, and keep balancing until the game improves, but useful playtests depend on concrete signals rather than vague reactions [yt:ZEoyoXUoIX8][src:level_playtesting][src:riot_prototype].

Interaction mode: structured watchlist. Visible input artifacts: Teaching Note, player pain points, and playtest goal. Work surface: Notion-style observer checklist. Output artifact: Wind Bud playtest watchlist. Good performance names observable behavior, success/failure signals, and noise that should not be counted as proof [src:level_playtesting][src:riot_prototype].

### 4. Run the Playtest
You observe three first-time players run the Wind Bud room against your watchlist. Designers must test, gather opinions, iterate, and keep balancing until the game improves, but the important part is watching what players actually do rather than defending the intended fix [yt:ZEoyoXUoIX8][src:level_playtesting][src:riot_prototype]. The team also does full-team play sessions and writes bugs when freezes or problems appear near release [yt:K64hbcUbslE].

Interaction mode: visual playtest timeline plus live observation log and fix-priority ranking. Visible input artifacts: your watchlist and moment-by-moment tester behavior. Work surface: playtest lab monitor with one conclusion-with-evidence note per tester plus a priority justification box. Output artifact: Run the Playtest observation log and prioritized fix rationale. Good performance connects observed behavior to success/confusion/noise, ranks fixes by evidence, and separates core comprehension blockers from lower-impact backlog or noise [src:level_playtesting][src:riot_prototype].

### 5. Spec Update
You write a concise implementation email for Priya, Leo, Owen, and Emi. O*NET lists formal design documentation, mockups, flowcharts, production schedules, test goals, and QA specifications as part of video game designer work [onet]. Real designers describe spending substantial time on documents, presentations, design docs, spreadsheets, and feedback between meetings [yt:RS9ec8SV77w][yt:ZEoyoXUoIX8][src:gitbook_gdd][src:gamedev_gdd].

Interaction mode: email compose. Visible input artifacts: teaching note, watchlist, playtest evidence, and team needs. Work surface: email draft. Output artifact: implementation spec update email. Good performance states the player problem, proposed change, acceptance criteria, risks, and test notes without over-prescribing engineering details [src:door_problem][src:riot_tools].

### 6. Engineering Handoff Prep
Before the implementation conversation, you prepare for the implementation gaps Priya is most likely to ask about after reading your spec email and priority ranking. Game planners/designers need strong management and communication skills because they coordinate with specialists and translate ideas into proposals and specifications [yt:K64hbcUbslE][src:door_problem]. Designers also communicate concepts to technical colleagues and provide test specifications [onet].

Interaction mode: optional typed prep note. Visible input artifacts: the player's priority ranking and an adaptive engineering agenda. Work surface: doc. Output artifact: optional prep note that remains visible in the later voice meeting if the student writes one. Good performance in the later meeting fills the most important gaps left by the student's own email: player-facing behavior, relevant edge cases or tuning rules, QA-verifiable criteria, and which details are design intent versus engineering choice [onet][yt:K64hbcUbslE][src:riot_agile].

### 7. Engineering Handoff with Priya
You speak with Priya in a studio huddle room. Face-to-face team discussions and communication with peers are frequent in the O*NET work context, and day-in-the-life sources show game planners spending much of the day in meetings with level, effects, costume, battle, and project teams [onet][yt:K64hbcUbslE][yt:M6hf4Ll_WkE][src:riot_agile].

Interaction mode: in-person voice meeting. Visible input artifacts: your optional prep note and a compact engineering reference card. Output artifact: transcript for grading. Good performance answers Priya's questions about the implementation gaps created by the student's actual spec email and priority ranking, including relevant edge cases, tuning or reset rules, QA criteria, and the boundary between design intent and implementation choice [onet][yt:M6hf4Ll_WkE][src:riot_agile].

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

> この本文内の採点表は `src/data/rubric.json` と同じ採点単位です。各採点項目は根拠シーン欄にあるタスクだけを根拠にします。会議・通話・面談の直前準備タスクは採点しません。複数シーンが並ぶ項目は、同じプレイグラウンドまたはワークフローを1つの10点枠に足し上げる例外です。

| 採点項目 | 根拠シーン | 採点基準 |
| :--- | :--- | :--- |
| 仕組みの問題整理 | mechanic_hook_sheet | 9-10: 遊びの仕組み、プレイヤーがつまずく理由、学ばせたい体験、改善仮説を具体的に整理できている。この点数は、指定されたそのタスクだけを根拠にし、前後の別タスク、準備メモ、後続成果物は根拠にしない。 7-8: 主要要素は満たすが、根拠、具体性、優先順位、記録、または相手への応答に小さな抜けがある。4-6: 一部はできているが、重要な判断、確認、説明、記録、または次の行動に複数の抜けがある。0-3: タスクの目的を外す、根拠を無視する、危険な約束や混乱を生む、または提出がほぼ使えない。 |
| 試遊観察リスト | playtest_watchlist | 9-10: 試遊で観察する行動、成功条件、混乱サイン、聞くべき確認を事前に明確化できている。この点数は、指定されたそのタスクだけを根拠にし、前後の別タスク、準備メモ、後続成果物は根拠にしない。 7-8: 主要要素は満たすが、根拠、具体性、優先順位、記録、または相手への応答に小さな抜けがある。4-6: 一部はできているが、重要な判断、確認、説明、記録、または次の行動に複数の抜けがある。0-3: タスクの目的を外す、根拠を無視する、危険な約束や混乱を生む、または提出がほぼ使えない。 |
| 試遊実行 | playtest_workspace | 9-10: 試遊中の観察事実と解釈を分け、プレイヤーの学習、失敗、楽しさの変化を記録できている。この点数は、指定されたそのタスクだけを根拠にし、前後の別タスク、準備メモ、後続成果物は根拠にしない。 7-8: 主要要素は満たすが、根拠、具体性、優先順位、記録、または相手への応答に小さな抜けがある。4-6: 一部はできているが、重要な判断、確認、説明、記録、または次の行動に複数の抜けがある。0-3: タスクの目的を外す、根拠を無視する、危険な約束や混乱を生む、または提出がほぼ使えない。 |
| 仕様更新 | spec_update | 9-10: 試遊で得た根拠をもとに、仕様変更、残す挙動、開発上の注意、未確認事項を明確に書けている。この点数は、指定されたそのタスクだけを根拠にし、前後の別タスク、準備メモ、後続成果物は根拠にしない。 7-8: 主要要素は満たすが、根拠、具体性、優先順位、記録、または相手への応答に小さな抜けがある。4-6: 一部はできているが、重要な判断、確認、説明、記録、または次の行動に複数の抜けがある。0-3: タスクの目的を外す、根拠を無視する、危険な約束や混乱を生む、または提出がほぼ使えない。 |
| 設計説明通話 | design_review | 9-10: 準備メモではなく実際の通話で、設計意図、仕様変更の理由、実装上の制約、未決事項を開発者へ説明できている。この点数は、指定されたそのタスクだけを根拠にし、前後の別タスク、準備メモ、後続成果物は根拠にしない。 7-8: 主要要素は満たすが、根拠、具体性、優先順位、記録、または相手への応答に小さな抜けがある。4-6: 一部はできているが、重要な判断、確認、説明、記録、または次の行動に複数の抜けがある。0-3: タスクの目的を外す、根拠を無視する、危険な約束や混乱を生む、または提出がほぼ使えない。 |
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
