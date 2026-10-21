# CHAT APPLICATION — COMPLETE DEVELOPMENT, IMPROVEMENT, AND SECURITY PLAN

## 1. Project Overview

Act as a senior full-stack engineer working on my existing chat application.

Your task is to inspect, improve, fix, and extend the existing application without rebuilding it from scratch.

The project requires improvements to UI/UX, mobile responsiveness, voice/video calling, email verification, account management, media sharing, message pinning, polls, text statuses, admin management, database separation, account recovery, and data retention.

The objective is to create a professional, reliable, secure, maintainable, and mobile-friendly messaging application.

### Core principles

- Preserve all existing working functionality.
- Fix existing bugs before introducing unnecessary architectural changes.
- Reuse components, services, hooks, middleware, and utilities wherever appropriate.
- Prevent data loss during database changes, account deletion, recovery, and migration.
- Enforce authentication, authorization, validation, and security on the backend.
- Do not duplicate existing features or create parallel implementations without a clear reason.
- Use free-tier services where practical, while respecting their actual limitations.
- Do not claim a feature is complete unless it has been implemented and appropriately tested.

---

# PART A — CODEBASE AUDIT AND IMPLEMENTATION STRATEGY

## 2. Inspect the existing project first

Before modifying code, inspect:

- Frontend framework, routing, components, contexts, hooks, and state management.
- Backend structure, routes, controllers, services, middleware, and validation.
- Authentication, sessions, tokens, and account lifecycle.
- MongoDB connections, schemas, collections, indexes, and relationships.
- Socket.IO events, WebRTC signaling, call state, and reconnection behavior.
- Push notifications and notification action handling.
- Media upload and storage implementation.
- Admin roles, permissions, and existing audit logging.
- Environment variables and deployment configuration.
- Existing tests, build scripts, and error-handling patterns.

Identify what already works, what is partially implemented, what is broken, and what is missing.

### Required initial deliverable

Prepare an implementation checklist containing:

1. Requirement.
2. Current implementation status.
3. Root cause or required change.
4. Files and modules affected.
5. Dependencies and prerequisites.
6. Data migration or security risks.
7. Acceptance criteria.
8. Testing method.

Do not begin by replacing major parts of the application. Start with the audit, then work incrementally.

---

# PART B — EXISTING FEATURE IMPROVEMENTS

## 3. Professional UI/UX redesign

Improve the entire application while preserving its existing functionality.

### Design requirements

- Use a consistent professional design system.
- Improve typography, spacing, colors, backgrounds, borders, shadows, and visual hierarchy.
- Use consistent button styles, form controls, dialogs, dropdowns, and menus.
- Use relevant icons for each action.
- Organize complex navigation using sidebars, drawers, tabs, grouped sections, and contextual menus.
- Avoid overcrowded layouts and unnecessary visual elements.
- Add smooth, purposeful transitions without compromising performance.
- Maintain consistency across chat, group chat, profile, settings, admin, and other pages.

### Responsive design

Support mobile phones, tablets, laptops, and desktop screens.

- Fix overflowing modals and dialogs.
- Prevent clipped content and horizontal scrolling where unintended.
- Ensure buttons remain accessible on small screens.
- Use suitable touch-target sizes.
- Ensure drawers and menus can be opened and closed conveniently.
- Prevent overlapping navigation, message controls, call controls, and input fields.
- Support keyboard navigation and accessible labels.
- Use icon-only mobile buttons with tooltips where appropriate, but never rely solely on a tooltip for essential information.

### Interaction quality

Add consistent:

- Loading indicators.
- Empty states.
- Error messages.
- Success feedback.
- Confirmation dialogs.
- Disabled states.
- Retry options.
- Form validation.
- Search and filter feedback.

Audit every visible button and interactive element. Remove inert controls or implement their intended functionality.

---

## 4. Reusable GridListView component

Create a reusable `GridListView` component following the existing project's naming and architecture conventions.

### Features

- Grid layout.
- List layout.
- Configurable item rendering.
- Configurable actions and contextual menus.
- Search.
- Filtering.
- Sorting.
- Pagination.
- Loading and empty states.
- Responsive layouts.
- Optional persistence of the user's preferred layout.

Only enable features relevant to each page; do not add unnecessary controls everywhere.

### Reuse the component in

- Admin user management.
- Group management.
- Announcements.
- Recovery requests.
- Audit logs.
- Database assignments.
- Other appropriate record-management pages.

Keep data fetching, authorization, and business logic in the appropriate parent pages or services rather than coupling them unnecessarily to the reusable view component.

---

## 5. Fix mobile sharing

### Existing issue

The share feature does not work correctly on mobile.

### Required implementation

- Inspect the existing share functionality and identify the actual cause.
- Use the Web Share API when supported.
- Provide a clipboard-copy fallback when native sharing is unavailable.
- Support the existing eligible share targets, such as links, messages, and files.
- Handle unsupported browsers, cancellation, permissions, and failed operations.
- Validate file-sharing support before invoking native share operations.
- Show appropriate feedback when sharing succeeds or fails.
- Avoid reporting success before the operation actually completes.

Test on supported Android browsers and desktop browsers.

---

## 6. Fix notification-triggered voice and video calls

### Existing bugs

1. When the receiver answers a call from a phone notification, the receiver's interface may update while the sender continues ringing.
2. When the receiver answers from a notification, the receiver's call UI sometimes does not open or synchronize correctly.
3. Normal in-app calls work more reliably than notification-triggered calls.

### Investigation

Inspect the existing:

- Socket.IO signaling events.
- WebRTC peer connection lifecycle.
- CallContext or equivalent call state management.
- Incoming and outgoing call components.
- Notification action handlers.
- Application foreground/background handling.
- Call timeout and cleanup logic.
- Audio and video track management.
- Reconnection and duplicate-event handling.

### Required behavior

- Answering from a notification must trigger the same valid call-acceptance workflow as answering inside the app.
- Open or restore the correct call interface when the platform permits it.
- Send the acceptance event to the caller.
- Stop sender ringback immediately after acceptance.
- Stop all ringing after rejection, timeout, or call termination.
- Keep sender and receiver call states synchronized.
- Handle ringing, accepted, connecting, connected, rejected, ended, missed, and failed states.
- Prevent duplicate acceptance events and duplicate call sessions.
- Handle network interruptions and signaling reconnection.
- Handle a call answered or ended on another device.
- Ensure that the correct caller, receiver, and call ID are used.
- Clean up stale sessions, audio tracks, video tracks, and event listeners.
- Preserve existing working in-app calling functionality.

### Acceptance tests

Test voice and video calls when the receiving application is:

- Foregrounded.
- Backgrounded.
- Reopened from a notification.
- In a supported terminated-app notification flow.
- Temporarily disconnected from the network.

Verify that the sender's ringing stops, the receiver sees the correct call interface, and both participants reach a consistent final call state.

Do not assume that an ordinary browser application can always launch a full-screen call UI from a terminated state. Identify platform limitations and use supported Android notification and application mechanisms where required.

---

# PART C — EMAIL AND ACCOUNT SECURITY

## 7. Nodemailer email system

Use Nodemailer with a configured SMTP provider for transactional email.

### Required email workflows

- Email verification.
- Resend verification email.
- Password reset.
- Account deletion confirmation.
- Account recovery request.
- Recovery approval or rejection notification.
- Important account security notifications.

### Reusable email templates

Create reusable, professional HTML email templates with:

- Clear subject lines.
- Application branding.
- A short explanation of the requested action.
- A secure action link.
- Expiration information where applicable.
- A safe fallback for clients that do not render HTML.
- A support or help reference where appropriate.

Use a shared email service rather than duplicating Nodemailer configuration in every controller.

### Security requirements

- Store SMTP credentials and secrets in environment variables.
- Never expose SMTP credentials to the frontend.
- Use cryptographically secure, expiring, single-use tokens.
- Store token hashes where appropriate.
- Validate tokens on the backend.
- Rate-limit email sending and token verification.
- Prevent token reuse.
- Handle expired links and resend requests safely.
- Avoid revealing sensitive account existence information.
- Never send passwords through email.
- Record email delivery attempts and relevant outcomes without logging raw tokens or secrets.

A password reset must change the password only after the reset token is successfully verified.

---

# PART D — NEW CHAT FEATURES

## 8. Message pinning

Add a pin-message action to direct chats and group chats where appropriate.

### Requirements

- Configurable maximum of one or two pinned messages per conversation.
- Configurable pin duration.
- Automatic unpinning after expiration.
- Manual unpinning by authorized users.
- A dedicated pinned-message section or view.
- Synchronization across devices.
- Clear feedback when the pin limit is reached.
- Handling for deleted messages and expired pins.
- Permission checks for pinning and unpinning.

Define whether pinning is available to all participants, group admins, or specific roles.

Enforce pin limits and permissions on the backend. Do not rely solely on frontend restrictions.

---

## 9. Polls in chats and groups

Allow users to create polls in direct conversations and group conversations.

### Features

- Poll question.
- Multiple answer options.
- Single-choice voting.
- Multiple-choice voting.
- Optional vote changes.
- Live vote counts.
- Results display.
- Optional expiration time.
- Open and closed poll states.
- Optional anonymous voting.
- Duplicate-vote prevention.

### Rules

- Validate poll creation and voting permissions.
- Prevent duplicate votes according to the configured voting rules.
- Define whether voters can see other voters' identities.
- Handle removed group members, deleted users, and expired polls.
- Persist votes and poll state in the backend.
- Synchronize results across devices.
- Define who can close or delete a poll.

---

# PART E — TEXT STATUS FEATURE

## 10. WhatsApp-style text status

Implement text-only status updates first. Photo and video status are not required for this phase.

### Status editor

Allow users to:

- Enter status text.
- Use emoji.
- Apply bold, italic, and strikethrough.
- Select decorative text styles.
- Choose text colors.
- Choose background colors.
- Preview the status.
- Publish a status.
- Delete their own status.
- Set status expiration.

Use a configurable expiration period, with 24 hours as the default if appropriate.

Implement formatting safely. Do not render arbitrary user-supplied HTML or scripts.

### Status privacy and audience

Provide three audience modes:

1. All eligible contacts.
2. All eligible contacts except selected users.
3. Only selected users.

Requirements:

- Searchable contact/user list.
- Select and deselect users.
- Persist privacy preferences.
- Display the selected audience clearly.
- Apply audience restrictions on the backend.
- Prevent unauthorized access through API requests or direct identifiers.
- Handle blocked users and contact eligibility according to existing application rules.

### Polls inside statuses

Allow an optional poll to be attached to a text status.

Requirements:

- Display poll options.
- Allow eligible viewers to vote.
- Prevent duplicate votes.
- Display results according to poll privacy rules.
- Synchronize results across devices.
- Respect status visibility and expiration.

Do not require photo or video status functionality unless explicitly added in a later phase.

---

# PART F — MEDIA SHARING AND STORAGE

## 11. Multer, Cloudinary, and Pinata/IPFS

Inspect the current media architecture before implementing new storage providers.

### Required architecture

- Use Multer for backend upload handling.
- Use Cloudinary for eligible images, videos, and other supported media.
- Evaluate Pinata/IPFS for files that benefit from content-addressed storage.
- Use a storage adapter or provider abstraction.
- Store media metadata in the appropriate database.
- Keep chat message logic independent of provider-specific implementation details.

### Media metadata

Track relevant information such as:

- File owner.
- Associated message or conversation.
- Storage provider.
- Provider identifier.
- MIME type.
- File size.
- Upload state.
- Creation timestamp.
- Access permissions.
- Deletion and retention state.

### Upload behavior

- Validate MIME types and file sizes on the backend.
- Reject unsupported or oversized files.
- Display upload progress and status.
- Handle upload cancellation and retry.
- Prevent duplicate records during retries.
- Handle partial upload failures.
- Protect private files.
- Generate secure access URLs where supported.
- Clean up orphaned media objects safely.
- Keep storage records consistent with message records.

### Free-tier requirements

Use free-tier services where practical, but verify their current terms and limits.

- Enforce provider-specific file-size limits.
- Respect storage, bandwidth, and request quotas.
- Do not assume unlimited storage.
- Provide understandable errors when quotas are exceeded.
- Keep storage configuration separate from application logic.
- Avoid provider lock-in.

IPFS does not automatically guarantee confidentiality or permanent availability. Protect private content through appropriate encryption, authorization, and provider availability controls.

---

## 12. Voice messages and storage reduction

Implement voice messages using the existing supported frontend and backend architecture.

### Features

- Record voice messages.
- Display recording duration.
- Preview or cancel a recording where appropriate.
- Send the recording.
- Display upload progress.
- Provide playback controls and progress.
- Handle interrupted uploads and retry.
- Ensure recipients can retrieve delivered messages.

### Storage strategy

Evaluate temporary transfer and peer-to-peer transfer if they genuinely reduce persistent storage requirements.

However, asynchronous messaging requires a way to retain voice messages when the recipient is offline.

Use persistent storage through the configured provider when required. Do not sacrifice message reliability merely to avoid storage costs.

Define retention and cleanup policies for temporary files.

---

# PART G — ADMIN DASHBOARD

## 13. Full-page admin dashboard

Create a dedicated, responsive admin dashboard with clear navigation and quick-access links.

### Required sections

- Dashboard overview.
- User management.
- Group management.
- Notices and announcements.
- Database management.
- Account deletion requests.
- Recovery requests.
- Audit logs.
- System settings.

### Admin interface requirements

- Use the reusable grid/list component.
- Add search, filters, sorting, and pagination where appropriate.
- Show relevant statuses.
- Provide edit, suspend, restore, and delete actions according to permissions.
- Use confirmation dialogs and warnings for destructive operations.
- Provide useful success and error feedback.
- Ensure the dashboard remains usable on mobile.

Every quick-access item must navigate to a functional page or action. Do not create placeholder buttons that appear functional but do nothing.

---

## 14. Admin permissions and destructive operations

Implement backend-enforced role-based access control.

Define permissions for:

- Editing records.
- Suspending and restoring users.
- Deleting users and groups.
- Deleting messages and media.
- Managing database assignments.
- Approving recovery requests.
- Approving permanent deletion.
- Managing announcements.
- Viewing sensitive audit records.

Do not automatically grant every admin unrestricted access to all data or secrets.

### Deletion safeguards

- Distinguish soft deletion, archival, restoration, and permanent deletion.
- Require confirmation for destructive operations.
- Require a reason for sensitive operations where appropriate.
- Maintain audit records.
- Preserve data needed for recovery or retention.
- Prevent deletion from accidentally breaking unrelated users' data.

Do not implement an unrestricted delete-all operation.

---

## 15. Admin news and announcement feed

Allow authorized admins to publish announcements when new features are introduced, important changes occur, or maintenance is scheduled.

### Features

- Create announcements.
- Edit announcements.
- Publish and archive announcements.
- Target eligible users or groups.
- Display applicable announcements in the user interface.
- Track acknowledgment per user.
- Automatically remove acknowledged announcements from each user's active feed when configured.
- Preserve the administrator's announcement history.

### Important behavior

A user dismissing an announcement must not delete it for other users.

Distinguish between:

- Delivered.
- Viewed, where reliable view tracking is available.
- Acknowledged.
- Dismissed.
- Archived by an administrator.

Do not generate announcements for every internal code change. Only publish them through an authorized admin action or an explicitly configured release workflow.

---

# PART H — DATABASE SEPARATION AND ADMIN ASSIGNMENT

## 16. Separate data by purpose

Inspect the existing database structure before making architectural changes.

The desired logical data categories are:

1. User and authentication data.
2. Direct-message data.
3. Group-chat data.
4. Activity and audit data.
5. Deleted-account and recovery data.

Determine whether each category requires separate collections, databases, or physical database connections.

Do not assume that separate logical categories must always be separate physical databases. Implement the separation required by the existing architecture, isolation needs, and operational constraints.

If separate physical databases are required, document the routing, connection lifecycle, indexing, transaction limitations, backups, and recovery strategy.

---

## 17. Admin database management interface

Build a dedicated page for authorized administrators to manage supported database assignments.

### Required functionality

- List configured databases.
- Display connection health.
- Show the active database assignment for eligible users and data categories.
- Allow an authorized admin to select a target database.
- Record assignment history.
- Validate target compatibility and permissions.
- Support controlled reassignment.
- Provide rollback.
- Record all operations in the audit log.

Never expose raw database credentials or unrestricted database commands in the frontend.

### Database assignment versus migration

These are separate operations.

**Database reassignment** changes which database the application uses for the relevant data.

**Data migration** copies or moves existing records between databases.

Changing an assignment must not silently copy, merge, overwrite, or delete old records.

### Required reassignment workflow

1. Record the current assignment.
2. Validate the target database and schema.
3. Identify the affected data categories.
4. Verify stable account, conversation, group, and message identifiers.
5. Preserve the old database and its records.
6. Update the database mapping through a controlled backend operation.
7. Verify the expected data is accessible.
8. Check for missing records, duplicate messages, and broken memberships.
9. Roll back if validation fails.
10. Record the outcome and any required follow-up migration.

The application must not silently create an empty account, abandon old messages, or break group membership because an admin changed a database assignment.

Keep old data accessible through a documented historical-data or restoration workflow.

---

# PART I — ACCOUNT DELETION, LOGIN, RECOVERY, AND RETENTION

## 18. Account lifecycle and deletion workflow

Implement this section exactly. Account deletion, login, new-account creation, recovery, and permanent deletion are different operations.

### State 1: Active account

The account works normally.

When the user selects Delete Account:

- Explain the consequences and recovery policy.
- Ask for confirmation.
- Send a deletion confirmation email to the registered address.
- Do not delete or deactivate the account just because the email was sent.
- Keep the account active until the user confirms through the valid email link.

### State 2: User confirms deletion through email

The email contains a secure, expiring confirmation link.

After the user opens the link and confirms the action:

- Mark the account as pending deletion.
- Record the request time and recovery deadline.
- Revoke or invalidate existing sessions as appropriate.
- Apply the configured access restrictions.
- Preserve the user's data during the recovery period.
- Show a confirmation page explaining the deadline and how recovery works.

Confirmation must not immediately and irreversibly destroy messages, groups, profile data, or database records.

### State 3: User logs in again with the same email during the recovery period

This is a mandatory behavior.

When a login or registration attempt uses an email associated with an account pending deletion or retained after deletion:

1. Detect the existing account state on the backend.
2. Apply the appropriate ownership-verification checks.
3. Do not silently create a new empty account.
4. Do not silently reactivate the old account.
5. Display a dedicated account-recovery screen explaining that the old account's data is still retained.

Show two explicit choices.

#### Option A — Recover Old Account

- Verify ownership through the registered email.
- Create a recovery request.
- Display the request in the admin dashboard.
- Keep the account restricted until an authorized administrator approves the request.
- After approval, restore the original account and eligible associated data.
- Verify messages, groups, memberships, profile data, and database assignments.
- Notify the user of approval or rejection.

The recovery operation must restore the original account identity rather than create a duplicate account.

#### Option B — Create New Account

- Explain that this creates a separate account and does not recover the old account.
- Require explicit user confirmation.
- Create a new internal account ID.
- Do not automatically attach old messages, groups, profile data, or database assignments.
- Retain the old data separately under the configured retention policy.
- Prevent duplicate active ownership of the same verified email.

If the old account reserves the email, implement an explicit email-ownership transfer or reservation workflow. Preserve the old account's internal identifier and recovery records.

Do not bypass unique-email constraints to create duplicate active accounts.

### State 4: User creates a new account but later wants old data

Allow the user to submit a new recovery request.

The admin dashboard must show the original account identifier, recovery deadline, retention state, available data categories, and current database assignment.

Authorized administrators may choose:

- Restore the original account.
- Restore eligible old data to the original account.
- Attach eligible old data to the new account through a controlled restoration workflow.

Before restoring or attaching data:

- Verify ownership.
- Check identifier conflicts.
- Check duplicate messages and group memberships.
- Check database assignments.
- Preserve the original data until verification succeeds.
- Require confirmation for the selected operation.
- Record the operation in the audit log.

Do not automatically merge old and new accounts.

If the old account is restored separately, resolve email ownership and active-account conflicts before enabling login.

### State 5: Recovery deadline expires

When the configured recovery period expires:

- Mark the account eligible for permanent deletion.
- Identify all records and media covered by the retention policy.
- Move eligible records to the restricted trash/retention database if this architecture is configured.
- Preserve original identifiers and database mappings needed for permitted recovery and audit.
- Make retained records inaccessible to normal application queries.
- Add the operation to the admin permanent-deletion review queue if approval is required.
- Permanently delete eligible data only after the configured retention and approval requirements are satisfied.
- Clean up associated media consistently.
- Record the outcome.

Do not promise recovery after data has been irreversibly deleted.

---

## 19. Trash database and recovery management

Implement a dedicated, restricted trash/retention database or an equivalent isolated retention mechanism.

### Required metadata

Track:

- Original account ID.
- Relevant verified email association.
- Original database assignment.
- Retained data categories.
- Deletion request time.
- Recovery deadline.
- Retention status.
- Recovery request status.
- Administrative decisions.
- Restoration history.
- Permanent-deletion status.

### Admin actions

- Inspect retained data and its status.
- Approve recovery.
- Reject recovery with a reason.
- Restore the original account.
- Restore the old database assignment.
- Attach eligible retained data to an existing account through a controlled workflow.
- Approve permanent deletion when permitted.
- Inspect operation history.

All actions require backend permission checks and appropriate confirmations.

Use recoverable, idempotent operations so retries cannot create duplicate restoration or deletion jobs.

Preserve data relationships during retention and restoration. Do not move records in a way that breaks the references between users, conversations, messages, and groups.

Define the retention period and approval policy as configuration rather than hard-coding arbitrary durations.

---

# PART J — SECURITY AND DATA INTEGRITY

## 20. Security requirements

- Enforce authorization on the backend.
- Validate all inputs and state transitions.
- Protect sensitive account actions with appropriate ownership verification.
- Rate-limit login, recovery, and email operations.
- Protect session and token handling.
- Keep credentials and secrets out of source code and frontend bundles.
- Restrict administrative database operations.
- Protect private media.
- Record sensitive operations in an append-only or otherwise tamper-resistant audit system where practical.
- Define retention policies for messages, media, account records, and audit logs.
- Do not delete records that must remain for applicable retention obligations.
- Use transactions where supported and compensating/recovery workflows where cross-database transactions are unavailable.

For critical multi-step operations, define explicit states, retries, idempotency, failure handling, and rollback.

---

# PART K — IMPLEMENTATION PHASES

## 21. Recommended order of work

### Phase 1: Audit and stabilize

- Inspect the complete codebase.
- Identify root causes of existing bugs.
- Fix notification-triggered calling.
- Fix mobile sharing.
- Fix major responsive UI problems.
- Document current database and authentication architecture.

### Phase 2: Reusable UI and admin foundation

- Build GridListView.
- Improve application-wide UI/UX.
- Create the full-page admin dashboard.
- Implement role-based permissions.
- Improve confirmations and audit logging.
- Implement the announcement feed.

### Phase 3: Email and account lifecycle

- Implement Nodemailer templates and configuration.
- Add email verification.
- Add password reset.
- Implement deletion confirmation.
- Implement the exact login-during-retention behavior.
- Add new-account and old-account recovery choices.
- Implement recovery approval and retention safeguards.

### Phase 4: Chat enhancements

- Implement pinned messages and expiration.
- Implement direct-chat and group polls.
- Implement text statuses.
- Add status formatting, colors, privacy, and audience selection.
- Implement polls inside statuses.

### Phase 5: Media improvements

- Implement the storage abstraction.
- Configure Multer and supported media providers.
- Implement media validation and secure access.
- Improve voice-message delivery and persistence.
- Test storage limits and cleanup.

### Phase 6: Database management

- Define logical and physical data separation.
- Implement database assignment management.
- Implement controlled reassignment.
- Implement explicit data migration.
- Implement trash/retention storage.
- Implement restoration and rollback.
- Verify data integrity.

### Phase 7: Final testing and deployment

- Run automated tests.
- Test real-device notification and calling behavior.
- Test mobile and desktop UI.
- Test account deletion, login, recovery, and new-account flows.
- Test database reassignment and rollback.
- Test permissions and unauthorized operations.
- Verify backups and recovery procedures.
- Document deployment configuration and remaining limitations.

If dependencies require a different sequence, explain why and update the checklist without silently omitting requirements.

---

# PART L — TESTING AND ACCEPTANCE CRITERIA

## 22. Required test scenarios

### Existing functionality

- Normal login and registration.
- Existing direct messaging and group messaging.
- Mobile share and clipboard fallback.
- Voice and video calls initiated in-app.
- Voice and video calls answered from notifications.
- Sender ringback termination.
- Receiver UI synchronization.
- Reconnection and stale-call cleanup.

### New chat features

- Pin limit enforcement.
- Pin expiration and manual unpinning.
- Poll creation, voting, duplicate prevention, and expiration.
- Status formatting, colors, and emoji.
- Status audience enforcement.
- Status poll voting.
- Announcement acknowledgment per user.

### Media

- Valid and invalid file uploads.
- File-size and MIME-type restrictions.
- Storage quota errors.
- Upload retry and cleanup.
- Private media authorization.
- Voice-message persistence.
- Retrieval by offline recipients.

### Account lifecycle

- Deletion email sent while the account remains active.
- Expired and reused confirmation links.
- Deletion confirmation.
- Login during the recovery period.
- Recovery request creation.
- Admin approval and rejection.
- New account creation while old data is retained.
- Email ownership conflict handling.
- Restoration of the old account.
- Restoration of eligible data to a new account.
- Retention deadline expiration.
- Permanent-deletion approval and execution.
- Verification that unrelated users' data remains untouched.

### Database management

- Valid and invalid target database.
- Reassignment without accidental data deletion.
- Access to old data after reassignment.
- Duplicate identifiers and conflicting records.
- Failed reassignment and rollback.
- Migration integrity.
- Restoration from retained data.
- Unauthorized admin attempts.

### UI and admin

- Responsive layouts on supported screen sizes.
- Grid/list behavior.
- Admin permission enforcement.
- Destructive-action confirmations.
- Functional quick-access navigation.
- Audit-log correctness.
- Announcement acknowledgment and dismissal.

## 23. Definition of done

A requirement is complete only when:

1. The implementation exists in the appropriate frontend and backend layers.
2. Authorization and validation are implemented where required.
3. Data changes are safe and recoverable where appropriate.
4. The relevant tests have been run.
5. Failure cases are handled.
6. The feature integrates with existing functionality.
7. The user interface gives accurate feedback.
8. Any platform limitations are documented.

Do not mark untested behavior as verified.

---

# PART M — FINAL REPORT

## 24. Required report after each phase

After each implementation phase, provide:

1. Completed requirements.
2. Files created and modified.
3. Root causes of bugs fixed.
4. Dependencies added and why.
5. Database and schema changes.
6. Environment variables and deployment configuration.
7. Tests executed and actual results.
8. Remaining issues and blocked requirements.
9. Security and data-integrity considerations.
10. Backup and rollback instructions for risky changes.

Maintain a master checklist of every requirement from this prompt.

At the end, report each requirement as:

- Implemented and tested.
- Implemented but not fully tested.
- Partially implemented.
- Blocked.
- Not implemented.

Do not silently omit requirements or claim success without evidence.

## Final instruction

Start by auditing the existing codebase and presenting the prioritized implementation plan. Then proceed incrementally, fixing critical existing bugs first, followed by UI/UX, account security, chat features, media, and database management.

Preserve all working functionality and existing data. Never perform destructive changes without explicit authorization and a verified recovery strategy.