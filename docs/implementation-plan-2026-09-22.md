# VANTAGE implementation plan — foundations through composed ATLAS

Date: 2026-09-22

Status: approved execution approach; implementation has not started under this plan. The first implementation task covers **steps 1–3 below**, then stops for owner review. Steps 4–10 describe the agreed continuation before broader connector integration.

## Scope and authority

This plan turns the approved [prototype specification](../PROTOTYPE_SPEC.md), [design guide](../DESIGN.md), [ecosystem brief](../VANTAGE_ECOSYSTEM.md) and [change record](atlas-workspace-change-record-2026-09-22.md) into implementation checkpoints. Follow [AGENTS.md](../AGENTS.md) and the decisions it lists, especially [0006 — shell/composition](decisions/0006-vantage-shell-and-composed-atlas.md), [0007 — connections](decisions/0007-configurable-connections.md) and [0008 — identity/session lifecycle](decisions/0008-authentication-and-session-lifecycle.md). This plan does not replace their requirements or reduce complete-prototype scope.

**Numbering matters:** this plan's ten steps are more detailed than specification §12. The first milestone, plan steps 1–3, covers baseline preparation and the specification's platform/identity and early-authentication stages. Home is **plan step 4** and follows the first review.

The owner has already committed and pushed the preparatory documentation and assets. The checkout inspected while writing this plan was clean at `a8e1922` (`update docs, plan and add nexus logo`). Inspect the actual checkout again when implementation starts; this is a reference, not an instruction to reset or check out that commit. Do not repeat the preparatory documentation update, commit or push. This plan and its [implementation prompt](implementation-prompt-2026-09-22.md) are the subsequent local handoff documents; they are not claimed to be pushed.

## Execution and delegation

Use one Astra Ultra coordinator. Complete dependent steps in order, with an integrated, verified checkpoint after each. The coordinator owns cross-module contracts, migration ordering, integration and acceptance. It should continue through authorized steps without requesting routine reapproval.

Subagent work is explicitly authorized for implementation. Assign bounded tasks that can progress independently: dependency inspection, focused review, test coverage or an implementation slice with settled contracts and explicit file ownership. Keep shared schema/migration generation, composition-root changes and generated-client updates under one owner. Coordinate test runs and local services so agents do not race over the same database, ports or generated files. Subagents return concise findings, changed paths and verification; the coordinator reviews and integrates their work.

Parallel implementation becomes more useful after ownership/session and connection contracts stabilize. Do not launch one agent per dependent numbered step. Prefer a small number of useful assignments over idle agents waiting on prerequisites. This follows the bounded-delegation approach in [OpenAI's subagent guidance](https://learn.chatgpt.com/docs/agent-configuration/subagents).

Two execution modes use the same checkpoints:

- **Step mode:** finish the explicitly selected next step, verify it and return it for review.
- **Continuous mode:** continue through the explicitly authorized range, recording each checkpoint. The initial task uses this mode for **steps 1–3 only**.

At the first milestone boundary, stop after step 3 and present a working foundation. The owner will review it before authorizing step 4 onward. A later fresh context can resume from the progress record; no milestone depends on remembering this conversation.

## 1. Baseline and migration safeguards

Inspect the current repository, working tree, running services, configuration paths and actual README commands. Confirm the existing aircraft/earthquake behaviour and run the checks relevant to the planned changes. Separate existing failures from new regressions. Preserve user changes and supplied VANTAGE, ATLAS and NEXUS assets.

Before modifying the operator's database, capture its current schema, workspace state, record counts and appropriate identity/content checks. Create a protected local backup and record a usable restore procedure. Keep backups, credentials and sensitive content out of tracked artifacts and ordinary logs. Test migrations against an isolated real PostgreSQL/PostGIS database before applying them to the operator's data; do not solve migration problems by recreating its volume.

**Checkpoint:** baseline behaviour and existing failures are recorded; affected paths and preservation checks are identified; the backup/restore preparation needed before migration is in place. This is preparation for implementation, not a new architecture discussion.

## 2. Platform ownership and module boundaries

Move shared domain data access and current projections to platform ownership. Apply explicit EF migrations for the current aircraft, earthquake and feed tables without changing source IDs, observation IDs or original provenance. Preserve domain-specific ordering and source/type-isolated retention. Reuse the working stores, coordinators, map/marker lifecycle, transport caches, results and inspector components.

Introduce stable internal user identity, issuer/subject mapping, resource ownership and authorization contracts. Plan and implement legacy ownership assignment against an explicitly configured initial operator; never assign existing work to whichever account logs in first. Keep the responsible user distinct from original source identity. Step 3 binds these contracts to the real provider.

Extend app registration with app/system-tool kind and branding/navigation metadata. Remove ATLAS-specific ownership assumptions from shared services and shell registration. Keep only working destinations visible: this step establishes the registration boundary, while Home/NEXUS screens arrive later. Prove platform data access through a test-only consumer with ATLAS unregistered.

**Checkpoint:** migration checks preserve data/reference identity; shared service and import/architecture checks enforce independence; existing aircraft and earthquake workflows remain functional. User/session contracts are ready for real authentication. Do not implement ATLAS state v2 or the configured-connection registry prematurely; those have their own migrations in steps 5 and 7.

## 3. First real authentication integration

Integrate a pinned compatible Keycloak reference service in Compose with a separate database/user. Use standard ASP.NET Core confidential OIDC authorization-code flow with PKCE, backend-held tokens and a backend-managed cookie session. Keep local services on loopback and document the actual development/HTTPS arrangements. Keycloak owns passwords, authenticator-app TOTP enrollment and recovery; VANTAGE owns resource authorization.

Provision the initial operator explicitly and finish the ownership migration. Implement real password/TOTP sign-in and sign-out against the existing application. Add protected session/bootstrap behaviour without building Home ahead of step 4. Protect REST, SignalR connection/subscription/resume and evidence access, enforce owner checks and CSRF protection, and clear or re-scope client state when identity/access changes.

Enforce sign-out, expiry and revocation through a documented bounded backend check. Termination releases affected subscriptions/background demand and cannot rely solely on browser cleanup. Establish and test the shared session-cancellation contract that later recording uses. The full Record/Replay workflow comes in the later feature stage; a lifecycle harness must not be presented as completed recording functionality.

Verify real provider enrollment/sign-in, protected API/live use and sign-out, plus meaningful negative access/session tests. Retained data survives session termination subject to policy; an unavailable provider never enables anonymous access. Keep secrets and TOTP enrollment material out of documentation, screenshots, test reports and exports. Broader account/recovery and clean-install acceptance remains a required later milestone, with its remaining work recorded explicitly.

**First milestone completion gate:**

- Real password/TOTP authentication protects the existing aircraft/earthquake application, with usable sign-out and documented session-expiry/revocation behaviour.
- Anonymous and unauthorized requests cannot retrieve another owner's work or establish protected live demand; logout removes the affected demand within the documented bound.
- Ownership/platform-table migrations preserve existing work and observation identities; the ATLAS-independent test consumer works.
- Required build, type/lint, relevant xUnit/PostGIS, Vitest and browser checks pass, or unresolved blockers are stated without claiming completion.
- OpenAPI/client generation is reproducible where changed. Actual setup, migration, run and review instructions are documented, and the local application is rebuilt for inspection.

These checks exercise portions of AC-01, AC-02, AC-11, AC-12, AC-17 and AC-21; they do not establish complete acceptance of those scenarios or of the prototype. **Stop here for owner review before step 4.**

## 4. VANTAGE Home, navigation and workspaces

Implement the authenticated Home with Workspaces / Apps / System / Account, deliberate workspace selection for app launch and navigation back Home. Make implemented system destinations usable without an open ATLAS workspace. Keep personal preferences, system configuration and explicitly saved workspace/app state separate; theme becomes a personal preference.

Preserve create, rename, duplicate, delete, restore, revision conflict handling and unsaved-work behaviour. Retain unavailable app state for recovery. NEXUS becomes a visible destination when its functional interface is supplied in step 6; do not show a working-looking placeholder.

**Checkpoint:** workspace operations and preferences work through the new shell; launching ATLAS has a clear destination; system navigation and both themes pass keyboard/list and visual checks.

## 5. Configurable connections in the platform

Implement the connector-type registry, versioned templates and multiple persisted connection instances. Store common identity/scope/revision fields relationally and schema-validated settings in JSONB. Add dataset metadata, protected backend credential references, availability scope, lifecycle operations and revision-safe validation/testing/import/export contracts.

Migrate existing aircraft/earthquake configuration once. Preserve user edits/deletions across restart and template upgrades. Coordinate collection/cache demand by connection, dataset, equivalent query and authorized access; preserve original observation identity/provenance separately. Connection availability alone starts no collection. Disable/remove has the documented effect on consumers and retained references.

**Checkpoint:** two independent connections of one type work; equivalent layer/pane demand shares upstream work; invalid edits retain the working revision; credentials do not appear in ordinary exports; source/domain isolation and access checks remain intact.

## 6. NEXUS connection management

Build the real system interface over step 5: list, Add from template/connector, Edit, Duplicate, Test/preview, Disable, Remove, Import and Export. Provide schema-driven forms, dataset discovery, coverage/capabilities, health, active demand, data age and affected-workspace information. Use supplied branding and shared Blueprint components.

Expose global/workspace-only availability without implying authorization. Imported unresolved credentials show setup-required. Show provider cadence/limits as metadata; operator polling controls remain deferred. Connection edits have their own Save. Closing NEXUS does not stop other authorized consumers.

**Checkpoint:** complete aircraft/earthquake connection workflows through NEXUS, including validation failures and restart persistence, without duplicate configuration forms in Settings or ATLAS.

## 7. Composed ATLAS pane state and contributors

Implement ATLAS state v2 with one camera/area/time context and multiple layer instances. Refactor aircraft/earthquake presentation into domain contributors over the existing shared components. Separate stable entity/observation references from layer/rendering identity; preserve domain revision and query semantics.

Migrate v1 workspaces using the previously active domain's camera/participation, preserving other domain settings and recoverable prior state without starting extra collection. Preserve invalid originals with a recovery explanation. Keep observations outside workspace state and context events.

**Checkpoint:** aircraft and earthquakes coexist in one pane; independent filters and selection work; duplicate layer appearances share data correctly; save/restart/migration preserve user state and unlinked panes remain independent.

## 8. Unified ATLAS interface

The owner's 2026-09-23 interface revisions supersede the original control placement and group-focus details below. The current implemented controls and verification are recorded in [DESIGN.md](../DESIGN.md) and the [progress record](implementation-progress-2026-09-22.md). This does not authorize step 9.

Implement Layers / Sources / Tools, category/layer navigation, shared control sections and combined legends. Add the grouped record explorer, mixed/domain tables, honest counts, explicit result scope, full-area list mode, overlap picking and shared inspection. Keep layer focus, record selection, visibility, participation and drawing order distinct. ATLAS Sources adds datasets as layers and opens the relevant NEXUS configuration.

Establish the shared dock/time structure for current capabilities and later extensions. Preserve keyboard focus, resizable panels, both themes, original branding and 2D/3D labels. Show supported actions and honest unavailability; full media, recording/replay, imagery acquisition and annotation/clip workflows remain in the following feature stage.

**Checkpoint:** representative combined layers are usable through map and keyboard/list workflows, with failure isolation, source provenance and stable selection. One dense or failing layer does not monopolize the pane.

## 9. Configurable GeoJSON proof

Implement DS-29 through the same connector/connection/dataset/layer contracts. Support the bounded geometry and declarative identity/label/time mappings in decision 0007, including off-map null geometry. Test content interpretation, endpoint/authentication constraints, bounds and last-valid-result behaviour. Generic features do not acquire invented specialized domain semantics.

**Checkpoint:** add a compatible feed entirely in NEXUS, preview it, and use it beside aircraft/earthquakes without changing application code. Demonstrate multiple connections and multiple presentations of one dataset, including malformed input and unknown-location handling. Record live smoke evidence separately from deterministic fixtures. Static file import alone does not satisfy this step.

## 10. Integrated checkpoint before connector breadth

Review and test the assembled sign-in → Home → NEXUS → workspace → composed ATLAS flow. Verify relevant contracts, migration/restart behaviour, ownership, session termination, connection lifecycle, shared demand, failure isolation, app independence and visual/accessibility behaviour. Regenerate affected schemas/OpenAPI/client artifacts and run actual repository build/test commands. Record performance checks relevant to the changed paths without claiming unmeasured prototype targets.

Rebuild the local application for review. Update README and the progress record with actual setup/run/recovery instructions, verified results, source limitations and outstanding acceptance work. Each earlier step has its own verification; this final checkpoint checks their interaction.

**Checkpoint:** the foundation is ready for adding more connectors and workflows through the approved contracts. Full AC-01–21 remains the eventual prototype completion gate.

## Progress and resumption

At implementation start, create or continue `docs/implementation-progress-2026-09-22.md`. Record the authorized step range and current checkout, then update after each completed step or material interruption:

- Status: pending, in progress, complete, or blocked, with the reason and evidence.
- Changed paths, settled contract/migration decisions and any compatibility consequences.
- Checks actually run, commands, outcomes and separate fixture/live-provider evidence.
- Protected backup location/restore procedure and local runtime information, without secret values.
- Remaining failures or necessary user input, current service state and the exact next action.

On resumption, inspect the checkout and actual implementation before trusting the journal. Keep completed requirements and remaining work distinct. A new context reads this plan, the progress record and authoritative documents, then continues the already-authorized range. Broaden testing only when changed behaviour or new failures justify it. The milestone boundary is a deliberate owner-review stop; a partially verified step is not complete.

## After this plan

Continue with remaining required connector breadth and domain capabilities under specification §12: vessels, satellites, imagery/environment, transit, media and the other approved reference sources. Complete spatial tools/radius search, saved queries, comparison/time, bounded session-bound Record/Replay, playback, annotations/clips/library, import/export, backup/restore and the AI capability interface/mock. Finish full identity-provider recovery/failure and clean-install checks, AC-01–21, accessibility and measured performance.

Passkeys, corporate directory integration, chat/team editing, advanced video intelligence, unattended recording, operator polling controls and additional analytical apps remain deferred as specified. Ordinary media discovery/playback remains included. No new provider integration beyond the approved DS-29 proof is added by this foundation plan.
