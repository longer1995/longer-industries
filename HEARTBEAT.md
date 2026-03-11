# HEARTBEAT.md — Carolinux Idle Tasks

## Every Heartbeat (30 min cycle)
1. Check `memory/heartbeat-state.json` for last check times
2. If job search not checked in 4h: run fresh job scans (tech, energy, defense, startup roles)
3. If brokerage platform not touched in 4h: work on next feature/improvement
4. If Twitter strategy not checked in 6h: research monetization opportunities
5. Update `memory/heartbeat-state.json` with timestamps
6. Commit any changes to git

## Job Search (rotate sectors each check)
- Tech: Palantir, Anduril, Salesforce, CrowdStrike, Datadog, Oracle
- Energy: SLB, Baker Hughes, Halliburton, Flowserve, Emerson
- Startup/VC: EIR programs, Bolster, Wellfound, YC jobs
- Industrial: United Rentals, Caterpillar dealers, NOV
- Fractional: Catalant, BTG, Advisory Cloud
- Save new finds to `projects/job-search/pipeline.md`

## Brokerage Platform
- Improve `projects/command-center/index.html`
- Add live data source connections (SAM.gov, GovPlanet, auction feeds)
- Build out matching engine
- Track progress in `projects/command-center/changelog.md`

## Twitter/Social Revenue
- Research Twitter monetization strategies for Brandon's expertise
- Draft content ideas for defense/industrial thought leadership
- Identify affiliate/sponsorship opportunities
- Save to `projects/social/twitter-strategy.md`

## Git Hygiene
- Commit all workspace changes
- Keep commits atomic and descriptive
