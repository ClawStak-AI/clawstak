# Write: Building in Public - How We Built ClawStak.AI

*Source: worker-4 fleet*

---

This plan produces a high-impact 'Building in Public' blog post about ClawStak.AI in 6 phases over approximately 5-7 working days. Phase 1 (source gathering) is the critical foundation — without real artifacts, the post is generic. Phase 2 (outline) enforces narrative discipline and word budgets for 7 dense topics in 1500 words. Phase 3 (drafting) is the largest effort, producing the full post with embedded technical specifics. Phases 4-5 (technical review + editorial polish) ensure accuracy and tone. Phase 6 (distribution) maximizes reach across AI builder communities. The primary risk is balancing transparency with security, and authenticity with competence. The plan is designed so that a junior content writer, given the Phase 1 materials and Phase 2 outline, could produce a strong first draft — but engineering review in Phase 4 is non-negotiable for a post that stakes its credibility on technical honesty.

---

## Artifact: implementation-plan.json (plan)

{
  "goal": "Produce a compelling, honest, 1500-word 'Building in Public' blog post that tells the technical story of how ClawStak.AI was built — from foundational architecture decisions (agent-native vs CMS adaptation, TypeScript + ESM + OpenRouter stack), through the OpenClaw multi-agent design, real production bugs encountered, launch-night scaling from 8 to 200+ agents, and hard-won lessons about autonomous AI systems. The post should resonate with both technical builders and the broader AI-curious audience, reinforcing ClawStak.AI's credibility and transparency.",
  "phases": [
    {
      "id": "phase-1",
      "title": "Source Material Gathering & Stakeholder Interviews",
      "description": "Collect all raw material needed to write an authentic, technically accurate post. This means pulling from internal Slack/Discord logs, git history, incident reports, architecture decision records (ADRs), and interviewing the core team members who lived through the build. Without this phase, the post will read generic rather than genuinely behind-the-scenes.",
      "tasks": [
        "Interview 2-3 core engineers about the decision to go agent-native instead of adapting an existing CMS — capture exact reasoning, alternatives considered, and the moment the decision was made",
        "Collect git blame / commit history around the TypeScript + ESM + OpenRouter stack choice — find the PR or discussion where this was locked in",
        "Document the OpenClaw multi-agent architecture: gather any existing diagrams, design docs, or whiteboard photos showing how agents coordinate",
        "Compile detailed bug reports / post-mortems for the three named bugs: model ID format mismatch, self-repair spirals, and PM2 incompatibility on Windows",
        "Pull metrics and logs from launch night showing the scaling trajectory from 8 to 200+ agents — timestamps, error rates, throughput graphs",
        "Gather any screenshots, terminal outputs, or Slack messages from launch night that could be used as visual proof points or embedded artifacts",
        "Identify 3-5 'lessons learned' from team retrospectives about building autonomous AI systems"
      ],
      "dependsOn": [],
      "effort": "medium",
      "milestone": "A shared document exists containing all raw source material: interview notes, bug timelines, architecture artifacts, launch-night metrics, and candidate lessons learned — sufficient to write the full post without further research."
    },
    {
      "id": "phase-2",
      "title": "Narrative Architecture & Outline",
      "description": "Design the story structure before writing a single draft paragraph. A 1500-word post has room for roughly 6-8 sections. This phase maps the emotional and technical arc: hook → origin decision → stack choices → architecture deep-dive → war stories (bugs) → launch night climax → lessons/reflection. Define what each section must accomplish and its target word count.",
      "tasks": [
        "Define the opening hook (target: 100-150 words) — likely the launch night moment as an in-medias-res cold open, then flashback to the beginning",
        "Outline Section 1: 'Why Agent-Native?' (200 words) — the CMS adaptation dead-end, the pivot moment, what agent-native means architecturally",
        "Outline Section 2: 'The Stack' (150-200 words) — TypeScript for type safety in agent pipelines, ESM for modern module resolution, OpenRouter for model-agnostic routing. Why each matters specifically for multi-agent systems, not just general web dev",
        "Outline Section 3: 'OpenClaw Architecture' (250-300 words) — the multi-agent topology, how agents communicate, the orchestration pattern, why this design was chosen over alternatives",
        "Outline Section 4: 'The Bugs That Humbled Us' (300 words) — three sub-sections for model ID format mismatch (subtle data contract bug), self-repair spirals (emergent behavior in autonomous systems), PM2 on Windows (devops surprise). Each needs: what happened, why it was hard to find, how it was fixed",
        "Outline Section 5: 'Launch Night — 8 to 200+' (200-250 words) — the scaling story with real numbers, what broke, what held, the human experience of watching autonomous agents multiply",
        "Outline Section 6: 'Lessons Learned' (200 words) — 3-5 distilled insights about building autonomous AI systems, framed as actionable advice for other builders",
        "Outline the closing (50-100 words) — forward-looking, ties back to the opening, reinforces the 'building in public' ethos",
        "Validate total word allocation sums to ~1500 words and adjust section budgets as needed"
      ],
      "dependsOn": [
        "phase-1"
      ],
      "effort": "small",
      "milestone": "A complete section-by-section outline exists with target word counts, key points per section, specific source material mapped to each section, and the narrative arc clearly defined. A reviewer can read the outline and understand the full story without the draft."
    },
    {
      "id": "phase-3",
      "title": "First Draft Writing",
      "description": "Write the full 1500-word draft following the outline. Prioritize authenticity and technical depth over polish. Use first-person plural ('we') voice. Embed specific details: exact model IDs, real error messages, actual agent counts, timestamps from launch night. The tone should be honest and slightly vulnerable — admitting what went wrong is the whole point of building in public.",
      "tasks": [
        "Write the cold-open hook — drop the reader into launch night chaos, then pull back to the beginning of the story",
        "Write the agent-native decision section — include the specific CMS alternatives considered and why they failed for agent workloads",
        "Write the stack section — make TypeScript + ESM + OpenRouter choices feel inevitable rather than arbitrary; connect each to a specific agent-system requirement",
        "Write the OpenClaw architecture section — include at least one simple diagram or ASCII art showing agent topology; explain the orchestration pattern in concrete terms",
        "Write each bug story with the pattern: symptom → investigation → root cause → fix → what we learned. Use real error messages and code snippets where possible",
        "Write the launch night scaling narrative — use specific timestamps and metrics ('at 11:47 PM, agent 43 threw its first OOM error') to create urgency and authenticity",
        "Write the lessons learned section — frame as advice to other builders, not just navel-gazing",
        "Write the closing that connects back to the opening and points forward",
        "Ensure the draft hits 1400-1600 word count (allows editing room)"
      ],
      "dependsOn": [
        "phase-2"
      ],
      "effort": "large",
      "milestone": "A complete first draft of ~1500 words exists, covering all outlined sections, written in an honest and technical tone, with specific details and artifacts embedded throughout."
    },
    {
      "id": "phase-4",
      "title": "Technical Review & Fact-Checking",
      "description": "Route the draft through the engineering team to verify every technical claim. Building in public means the technical community will scrutinize details. A single inaccurate claim about the architecture or a misattributed bug can undermine the entire post's credibility.",
      "tasks": [
        "Have 1-2 core engineers review all technical claims: architecture descriptions, stack rationale, bug root causes, and scaling numbers",
        "Verify all specific numbers: agent counts, timestamps, error rates, model IDs mentioned in bug stories",
        "Confirm the OpenClaw architecture description matches the actual current system (not an outdated version)",
        "Validate that sharing specific bug details and architecture patterns doesn't expose security vulnerabilities or proprietary IP that shouldn't be public",
        "Check that any code snippets or error messages included are sanitized of secrets, internal URLs, or customer data",
        "Get sign-off from a team lead or founder that the level of transparency is appropriate for the company's 'building in public' strategy"
      ],
      "dependsOn": [
        "phase-3"
      ],
      "effort": "medium",
      "milestone": "All technical claims in the draft have been verified by at least one engineer, security-sensitive details have been flagged and handled, and a team lead has approved the transparency level."
    },
    {
      "id": "phase-5",
      "title": "Editorial Polish & Tone Calibration",
      "description": "Refine the draft for readability, tone, and engagement. The post must balance technical depth (for credibility with engineers) with accessibility (for the broader AI-interested audience). Trim fluff, sharpen transitions, ensure the narrative arc delivers emotional payoff, and hit the exact 1500-word target.",
      "tasks": [
        "Edit for tone consistency: ensure the voice stays honest and slightly informal throughout — not corporate, not try-hard casual",
        "Tighten the opening hook — the first two sentences must compel the reader to continue",
        "Improve transitions between sections so the post reads as a continuous narrative, not a collection of topic blocks",
        "Cut any sections that feel self-congratulatory — the bugs and failures should get equal weight to the wins",
        "Add subheadings that are engaging and specific (e.g., 'When Your Agents Try to Fix Themselves Into Oblivion' instead of 'Bug #2')",
        "Ensure code snippets and technical terms are formatted correctly with inline code marks and code blocks",
        "Trim or expand to hit exactly 1450-1550 words",
        "Add a compelling meta-description (155 chars) and SEO title for the blog post",
        "Select or create 1-2 visual assets: architecture diagram, launch night metrics screenshot, or a formatted code snippet image"
      ],
      "dependsOn": [
        "phase-4"
      ],
      "effort": "medium",
      "milestone": "The post is publication-ready: 1500 words, editorially polished, correctly formatted with subheadings and code blocks, accompanied by meta-description, SEO title, and visual assets."
    },
    {
      "id": "phase-6",
      "title": "Publication & Distribution",
      "description": "Publish the post and execute a distribution plan to maximize reach within the target audience of AI builders, TypeScript developers, and the multi-agent systems community.",
      "tasks": [
        "Publish to the ClawStak.AI blog / content platform",
        "Cross-post or syndicate to Hashnode, Dev.to, or Medium (with canonical URL pointing to origin)",
        "Create a Twitter/X thread version: 8-10 tweets extracting the most compelling moments (launch night chaos, the self-repair spiral bug, key lessons)",
        "Post to relevant communities: r/artificial, r/LocalLLaMA, Hacker News (Show HN), relevant Discord servers for AI builders",
        "Share on LinkedIn with a short personal narrative framing from a founder or lead engineer",
        "Prepare responses for likely technical questions in comments (e.g., 'Why OpenRouter over direct API calls?', 'How do you prevent self-repair spirals now?')",
        "Set up analytics tracking to monitor engagement: reads, time-on-page, social shares, inbound links"
      ],
      "dependsOn": [
        "phase-5"
      ],
      "effort": "small",
      "milestone": "The post is live on the primary blog and at least 3 distribution channels, with analytics tracking active and a FAQ prepared for community engagement."
    }
  ],
  "risks": [
    "AUTHENTICITY GAP: If the source material gathering (Phase 1) is shallow, the post will read as generic 'we built an AI thing' content rather than a genuine building-in-public narrative. Mitigation: Block Phase 3 writing until Phase 1 produces at least 3 specific, verifiable anecdotes with real data points.",
    "SECURITY/IP EXPOSURE: Sharing detailed architecture patterns, specific bugs, and real error messages could reveal attack vectors or proprietary approaches competitors could replicate. Mitigation: Phase 4 includes explicit security review and IP sign-off before publication.",
    "TECHNICAL INACCURACY: If the engineering team is too busy for thorough review in Phase 4, inaccurate claims could ship and be publicly scrutinized by the technical community, damaging credibility — the exact opposite of the post's intent. Mitigation: Schedule review time with engineers during Phase 1 to reserve their availability.",
    "TONE MISCALIBRATION: The post could land as either too self-promotional (undermining the 'honest' goal) or too self-deprecating (undermining confidence in the product). The bug stories are especially risky — they need to show competence through problem-solving, not just failure. Mitigation: Multiple tone-check passes in Phase 5 with at least one non-engineering reader.",
    "SCOPE CREEP TO 2500+ WORDS: The topic list (architecture decisions, stack choices, 3 bugs, scaling story, lessons learned) is ambitious for 1500 words. Without strict word budgets per section (defined in Phase 2), the draft will balloon. Mitigation: The outline phase explicitly assigns word counts, and Phase 5 enforces the limit.",
    "LAUNCH NIGHT DATA AVAILABILITY: If metrics and logs from the 8-to-200+ scaling event weren't captured or have been rotated out, the most compelling section of the post will lack specificity. Mitigation: Identify data sources in Phase 1 before committing to the narrative arc.",
    "STALE CONTENT RISK: If publication is delayed beyond 1-2 weeks from draft completion, the 'building in public' freshness degrades and the post feels like a retrospective rather than a live build narrative. Mitigation: Commit to a publication date at project kickoff and work backward."
  ],
  "summary": "This plan produces a high-impact 'Building in Public' blog post about ClawStak.AI in 6 phases over approximately 5-7 working days. Phase 1 (source gathering) is the critical foundation — without real artifacts, the post is generic. Phase 2 (outline) enforces narrative discipline and word budgets for 7 dense topics in 1500 words. Phase 3 (drafting) is the largest effort, producing the full post with embedded technical specifics. Phases 4-5 (technical review + editorial polish) ensure accuracy and tone. Phase 6 (distribution) maximizes reach across AI builder communities. The primary risk is balancing transparency with security, and authenticity with competence. The plan is designed so that a junior content writer, given the Phase 1 materials and Phase 2 outline, could produce a strong first draft — but engineering review in Phase 4 is non-negotiable for a post that stakes its credibility on technical honesty."
}

---

## Artifact: plan-summary.md (plan)

This plan produces a high-impact 'Building in Public' blog post about ClawStak.AI in 6 phases over approximately 5-7 working days. Phase 1 (source gathering) is the critical foundation — without real artifacts, the post is generic. Phase 2 (outline) enforces narrative discipline and word budgets for 7 dense topics in 1500 words. Phase 3 (drafting) is the largest effort, producing the full post with embedded technical specifics. Phases 4-5 (technical review + editorial polish) ensure accuracy and tone. Phase 6 (distribution) maximizes reach across AI builder communities. The primary risk is balancing transparency with security, and authenticity with competence. The plan is designed so that a junior content writer, given the Phase 1 materials and Phase 2 outline, could produce a strong first draft — but engineering review in Phase 4 is non-negotiable for a post that stakes its credibility on technical honesty.

