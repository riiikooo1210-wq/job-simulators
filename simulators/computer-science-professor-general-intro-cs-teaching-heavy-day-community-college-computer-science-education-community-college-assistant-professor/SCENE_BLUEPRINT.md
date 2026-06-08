# Scene Blueprint - computer-science-professor-general-intro-cs-teaching-heavy-day-community-college-computer-science-education-community-college-assistant-professor

Use this as the Phase 2 approval artifact. It shows the practical chain: visible input artifact -> student action -> output artifact -> rubric evidence.

## Work Mix

- Summary: Sources describe a community-college CS professor day as teaching-heavy and high-contact: classroom teaching, live misconception diagnosis, office hours, grading, LMS records, student support, and department coordination.
- `physicalProceduralTool`: secondary - classroom teaching is visible, but the loop reset is cognitive teaching work rather than a physical manipulation task.
- `digitalToolArtifactWork`: major - Canvas, SpeedGrader, Slack, lesson documents, support boards, and announcements should be visible.
- `cognitiveAnalysisDecision`: major - diagnose misconceptions, prioritize limited time, and distinguish class-wide patterns from individual cases.
- `writtenDocumentationArtifact`: major - lesson adjustment, feedback, Slack update, and LMS announcement are real deliverables.
- `spokenInterpersonalCommunication`: major - the classroom loop reset and office hours should be in-person voice conversations.
- `passiveMonitoringWaitingContextSwitching`: secondary - time pressure frames the day but does not replace active work.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Mesa Vista | `intro` | - | - | - | not mapped | `briefing_morning` |
| `briefing_morning`<br>Before the 9:30 Section | `briefing` | Morning source packet: 60-second CS cheat sheet, Canvas messages, Lab 4 pattern, chair deadline, tutoring slots | Read context | - | not mapped | `triage_morning` |
| `triage_morning`<br>Pick the First Move | `multiple_choice` | Morning source packet from `briefing_morning` | Choose the first preparation move under time pressure | First-move choice | Instructional Diagnosis | Branches to `redirect_email`, `redirect_diagnostic`, `redirect_pacing`, or `redirect_admin` |
| `redirect_email`<br>The Inbox Expands | `briefing` | Consequence of email-first choice | Read consequence | - | not mapped | `lesson_plan` |
| `redirect_diagnostic`<br>A Useful Diagnostic Window | `briefing` | Consequence of diagnostic-first choice | Read consequence | - | not mapped | `lesson_plan` |
| `redirect_pacing`<br>Pacing Meets Reality | `briefing` | Consequence of pacing-first choice | Read consequence | - | not mapped | `lesson_plan` |
| `redirect_admin`<br>The Report Can Wait | `briefing` | Consequence of admin-first choice | Read consequence | - | not mapped | `lesson_plan` |
| `lesson_plan`<br>Plan the First 15 Minutes | `free_text` / `notion` | Tabs: warm-up data, projected code example, beginner CS facts, teaching bar | Draft a three-part pre-class mini-lesson plan | Lesson prep note | Instructional Diagnosis; Mini-Lesson Design | `classroom_reset` |
| `classroom_reset`<br>Opening Prediction Prompt | `free_text` / `doc` | Projected loop, prior lesson plan, beginner quick guide | Write the exact prompt the professor will read aloud in class | Opening prompt note | Instructional Diagnosis; Classroom Facilitation | `loop_reset_trace` |
| `loop_reset_trace`<br>Trace-Table Follow-Up | `voice_meeting` / `in_person` | Player's opening prompt via `prepNoteKey`, projected code, trace-table cheat sheet | Read the opening prompt aloud, respond to student answers, guide a trace table, and decide aloud whether to move on | Classroom voice transcript | Mini-Lesson Design; Classroom Facilitation | `loop_reset_evidence` |
| `loop_reset_evidence`<br>Class Wrap-Up | `briefing` / classroom transition | Students finish the trace table and log out of the lab computers | Read the transition as class ends and Jayden lingers for office hours | - | not mapped | `office_hour` |
| `office_hour`<br>Office Hours with Jayden | `voice_meeting` / `in_person` | Jayden context reference plus loop quick guide | Use a six-minute / seven-professor-turn office-hour window to diagnose misconception, explain one idea, and leave Jayden ready to try again | Voice transcript | Office-Hour Coaching | `support_matrix` |
| `support_matrix`<br>Prioritize Student Support Cases | `kanban_board` / `kanban` | Support triage criteria and six detailed case cards | Move every case card and write rationale | Completed triage board plus rationale | Support Prioritization | `chair_slack` |
| `chair_slack`<br>Department Chair Check-in | `slack_thread` / `slack` | Chair Slack message plus separate Tutoring Center note and Canvas summary source tabs | Send concise FERPA-aware update | Slack reply and NPC acknowledgement | Professional Coordination | `grading_feedback` |
| `grading_feedback`<br>Grade Two Loop Lab Submissions | `free_text` / `doc` | Tabs: Maya code, Luis code, beginner quick guide, feedback guide | Write two student-facing feedback comments from visible instructor notes | SpeedGrader feedback comments | Student-Facing Written Feedback | `lms_announcement` |
| `lms_announcement`<br>Post the Canvas Announcement | `free_text` / `email` | Tabs: announcement facts, support options, tone bar; email headers | Write Canvas announcement | LMS announcement | LMS Communication | `grading` |
| `grading`<br>End of Teaching Day | `grading` | - | AI grading | Scores/comments | all rubric criteria | `final_report` |
| `final_report`<br>Final Report | `final_report` | Grading result | Review report | Final report | all rubric criteria | null |

## Constructed-Response / Action Coverage

- `lesson_plan`: typed lesson adjustment.
- `classroom_reset`: typed opening prompt to read aloud from visible code evidence.
- `loop_reset_trace`: in-person voice transcript where the player reads their prompt, responds to student answers, guides the trace table, and makes the move-on decision.
- `office_hour`: in-person voice transcript.
- `support_matrix`: kanban sorting and rationale.
- `chair_slack`: Slack reply.
- `grading_feedback`: typed feedback comments from visible code.
- `lms_announcement`: typed LMS announcement.

Every constructed-response or action scene is mapped to at least one rubric criterion through `evidenceSceneIds`.
