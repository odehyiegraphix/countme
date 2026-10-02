# Product Requirements Document (PRD)

## Secure Geo-Location and Dynamic QR-Based Attendance Management System with Academic Performance Analytics

| Field | Value |
|---|---|
| Document type | Product Requirements Document |
| Version | 2.0 |
| Status | Revised Draft |
| Source | Based on the original project proposal and PRD |
| Target platform | Responsive web application |
| Primary users | Students, Lecturers, Parents/Guardians, Administrators, Administrators |
| Prototype scope | Single-institution tertiary attendance prototype |

---

## 1. Overview

Tertiary institutions may rely on manual roll calls, paper registers, static QR codes, or other attendance processes that can be slow, difficult to audit, and vulnerable to proxy attendance. Attendance information may also be separated from academic performance data, limiting its usefulness for academic monitoring.

This project delivers a web-based attendance management system that combines **dynamic QR verification, authenticated sessions, geolocation proximity checks, application-level device binding, database-level duplicate prevention, audit logging, and academic performance analytics**.

The system is designed as a layered verification system. No single control is treated as absolute proof of physical presence. Instead, multiple signals are combined to reduce common forms of attendance fraud and provide evidence that can be evaluated during testing.

The system also provides role-specific access for students, lecturers, parents/guardians, Administrators, and administrators.

---

## 2. Problem Statement

1. Manual attendance processes can be slow and difficult to audit.
2. Static or shareable attendance codes can be reused by students who are not physically present.
3. A QR code by itself does not prove that a student is at the lecture venue.
4. Attendance records may be difficult for Administrators and administrators to monitor across courses and departments.
5. Parents/guardians may have limited visibility into their wards' attendance.
6. Attendance and academic performance data are often maintained separately.
7. Systems may not adequately record failed attempts, duplicate submissions, or suspicious activity.
8. Lecturer manual intervention can become another source of inconsistency if it is not auditable.

---

## 3. Goals and Objectives

### 3.1 Primary Goal

Design and implement a secure, verifiable attendance management system that reduces common attendance fraud, provides controlled stakeholder visibility, and supports analysis of attendance and academic performance.

### 3.2 Specific Objectives

The system shall:

1. Allow lecturers to create, start, monitor, and close class sessions.
2. Generate short-lived, cryptographically protected QR codes for active sessions.
3. Verify that students are enrolled in the course before accepting attendance.
4. Verify the student's location against the authorized lecture location.
5. Consider the reported location accuracy when evaluating geolocation.
6. Require authentication before attendance can be recorded.
7. Bind student accounts to application-level device identifiers as an additional fraud-detection signal.
8. Prevent duplicate attendance at the database level.
9. Record both successful attendance and significant failed/suspicious attempts for audit purposes.
10. Provide a controlled manual attendance fallback for legitimate exceptions.
11. Require a reason and audit trail for manual attendance entries.
12. Give parents/guardians read-only access to attendance for linked wards.
13. Give Administrators and administrators appropriate aggregated attendance dashboards.
14. Allow lecturers to upload academic performance records using a defined CSV format.
15. Calculate attendance and performance statistics, including correlation where sufficient data exists.
16. Provide reports and visualizations for relevant stakeholders.
17. Apply role-based access control throughout the system.
18. Protect sensitive attendance, location, and academic data.

### 3.3 Non-Goals

The prototype will not include:

- Multi-campus or multi-tenant enterprise deployment.
- Institutional SSO federation.
- Biometric verification.
- Continuous/background location tracking.
- Native iOS/Android applications.
- Automated causal claims that attendance causes academic performance.
- Production-grade anti-cheat guarantees.
- Fully offline cryptographic attendance validation.

---

## 4. Target Users and Personas

| Persona | Primary needs |
|---|---|
| Student | Fast attendance check-in and personal attendance history |
| Lecturer | Session management, live attendance, manual exception handling, results upload, analytics |
| Parent/Guardian | Read-only attendance visibility for linked wards |
| Administrator | Department-level attendance and performance monitoring |
| Administrator | User management, oversight, auditing, reporting, and system configuration |

---

## 5. Core Product Principles

### 5.1 Verification by Layers

A valid QR scan alone must not create attendance. The system evaluates:

1. Authentication
2. Active session
3. Valid QR token
4. Student course enrollment
5. Session time
6. Geolocation
7. Location accuracy
8. Device binding
9. Duplicate status

### 5.2 Reject by Default, Review by Exception

For automated verification, a failed security condition should normally prevent attendance from being recorded.

However, the system may preserve the failed attempt for review.

Example:

- Student is 180 metres outside a 100-metre radius.
- Automated attendance is rejected.
- The attempt is stored as `OUT_OF_RANGE`.
- An authorized lecturer/admin may review the case.
- If approved through the defined exception process, a separate manual/approved record is created.

### 5.3 No Absolute Fraud Prevention Claim

The system is intended to reduce and detect common attendance fraud. Testing shall measure the effectiveness of the controls rather than claim that proxy attendance or spoofing is impossible.

---

## 6. User Stories

### Student

- As a student, I want to scan a current QR code and submit attendance quickly.
- As a student, I want the system to reject attendance if I am outside the authorized location.
- As a student, I want to know why my attendance attempt was rejected.
- As a student, I want to view attendance by course.
- As a student, I want to see whether an attendance record was QR-verified or manually recorded.

### Lecturer

- As a lecturer, I want to start a session and display a rotating QR code.
- As a lecturer, I want to see attendance submissions in real time.
- As a lecturer, I want failed and suspicious attempts to be visible.
- As a lecturer, I want to manually record attendance for legitimate exceptions.
- As a lecturer, I want every manual override to require a reason and be auditable.
- As a lecturer, I want to upload assessment results and compare them with attendance.

### Parent/Guardian

- As a parent/guardian, I want to view attendance only for students linked to my account.
- As a parent/guardian, I want to view attendance percentage and recent attendance activity.

### Administrator

- As an Administrator, I want to view attendance trends across courses in my department.
- As an Administrator, I want to identify courses or students with persistent absenteeism.
- As an Administrator, I want access to relevant attendance-performance summaries.

### Administrator

- As an administrator, I want to manage users and roles.
- As an administrator, I want to review suspicious attendance activity.
- As an administrator, I want to audit manual overrides.
- As an administrator, I want to generate institutional reports.

---

# 7. Functional Requirements

## 7.1 Authentication and Authorization

**FR1.1** All users must authenticate before accessing protected functionality.

**FR1.2** The system must support secure token/session-based authentication.

**FR1.3** Role-based access control must be enforced at the API and interface levels.

**FR1.4** Roles shall include:

- Student
- Lecturer
- Parent/Guardian
- Administrator
- Administrator

**FR1.5** Users must not access records outside their authorized scope.

**FR1.6** Protected API endpoints must validate the authenticated user's role and resource ownership/relationship.

---

## 7.2 Academic Structure

The system shall support:

- Departments
- Courses
- Students
- Course enrollments
- Course offerings/classes
- Class sessions

**FR2.1** A student must have an active enrollment in a course before attendance can be accepted.

**FR2.2** A lecturer can only start sessions for courses assigned to them.

**FR2.3** Administrator access shall be restricted to the relevant department.

---

## 7.3 Lecturer Session Management

**FR3.1** Lecturers can create/start a class session.

**FR3.2** A session shall contain:

- Course
- Lecturer
- Lecture location
- Allowed radius
- Start time
- End time
- Attendance window
- Session status

**FR3.3** Session statuses shall include:

- `SCHEDULED`
- `ACTIVE`
- `ENDED`
- `CANCELLED`

**FR3.4** Attendance may only be submitted while the session is active and within its attendance window.

**FR3.5** Lecturers can end a session.

**FR3.6** Once ended, a session cannot accept normal QR attendance.

**FR3.7** Lecturers can view live attendance counts and verification status.

---

## 7.4 Dynamic QR Code

**FR4.1** Starting a session generates a unique session identifier.

**FR4.2** The server generates short-lived signed QR tokens.

**FR4.3** QR payloads shall contain only the information necessary for validation, such as:

- Session identifier
- Token identifier
- Expiration information
- Cryptographic signature

**FR4.4** QR tokens shall expire after a short configurable interval.

**FR4.5** A new valid token shall be generated when the current token expires.

**FR4.6** The server, not the client, is the final authority for QR validation.

**FR4.7** The system must reject:

- Expired tokens
- Invalid signatures
- Unknown sessions
- Inactive sessions
- Tampered tokens
- Replayed invalid tokens

**FR4.8** QR validation failures shall be logged where appropriate.

---

## 7.5 Student Attendance Check-In

The standard check-in workflow shall be:

```text
Student Login
     ↓
Scan QR
     ↓
Validate Session
     ↓
Validate QR Token
     ↓
Validate Enrollment
     ↓
Validate Time Window
     ↓
Request Current Location
     ↓
Calculate Distance
     ↓
Check Location Accuracy
     ↓
Validate Device Binding
     ↓
Check Duplicate Attendance
     ↓
Create Verified Attendance
```

**FR5.1** Students must authenticate before attendance submission.

**FR5.2** The student interface must request camera permission to scan the QR.

**FR5.3** The interface must request current location permission at the time of attendance validation.

**FR5.4** The system must validate course enrollment.

**FR5.5** The system must validate session status and time.

**FR5.6** The system must validate the QR token.

**FR5.7** The system must validate location and device conditions.

**FR5.8** A successful automated check-in shall create a `VERIFIED` attendance record.

---

## 7.6 Geolocation Verification

**FR6.1** The system shall calculate the distance between the student's reported coordinates and the session location.

**FR6.2** Distance may be calculated using the Haversine formula or an equivalent geographic distance method.

**FR6.3** Attendance shall be automatically accepted only when the calculated distance is within the configured radius and other validation conditions pass.

**FR6.4** The system shall evaluate the device-reported location accuracy.

**FR6.5** Location readings with excessive uncertainty shall be rejected or flagged according to configured rules.

**FR6.6** Exact coordinates shall only be collected when required for attendance verification.

**FR6.7** The system shall not continuously track students in the background.

### Out-of-Range Rule

When a student is outside the authorized radius:

1. Automated attendance is not created.
2. The attempt is stored as `OUT_OF_RANGE`.
3. Distance and accuracy information are recorded.
4. The student receives a clear explanation.
5. Authorized staff may review the attempt through the appropriate exception workflow.

---

## 7.7 Device Binding

**FR7.1** The system shall use an application-level device identifier rather than IMEI, MAC address, or other restricted hardware identifiers.

**FR7.2** A student's account shall have a registered device binding.

**FR7.3** Attendance submissions shall be checked against the registered device.

**FR7.4** A device associated with multiple student accounts shall be flagged for review.

**FR7.5** Device binding shall be treated as a fraud-reduction and anomaly-detection signal, not absolute proof of identity.

**FR7.6** Device reset/replacement shall use an administrator-controlled or defined recovery process.

---

## 7.8 Duplicate Prevention

**FR8.1** The database shall enforce a unique constraint on:

```text
(session_id, student_id)
```

**FR8.2** Rapid repeated submissions shall not create duplicate attendance.

**FR8.3** Application-level duplicate checks shall be used in addition to the database constraint.

**FR8.4** Duplicate attempts may be recorded in the attendance-attempt log for audit purposes.

---

## 7.9 Attendance Attempts and Audit Trail

The system shall distinguish between an **attempt** and an **official attendance record**.

An attempt may result in:

- `VERIFIED`
- `OUT_OF_RANGE`
- `LOW_LOCATION_ACCURACY`
- `INVALID_QR`
- `EXPIRED_QR`
- `NOT_ENROLLED`
- `DUPLICATE`
- `INVALID_SESSION`
- `DEVICE_FLAGGED`
- `MANUAL`
- `REJECTED`

**FR9.1** Significant failed attempts shall be logged.

**FR9.2** Successful QR attendance shall create an attendance record.

**FR9.3** Failed attempts shall not automatically count as attendance.

**FR9.4** Audit records shall include relevant user, session, timestamp, validation result, and reason information.

---

## 7.10 Manual Attendance Fallback

Manual attendance exists for legitimate exceptions such as:

- Student's phone is unavailable.
- Camera is not functioning.
- GPS cannot obtain an adequate reading.
- Other institution-approved exception.

**FR10.1** Only an authorized lecturer may create a manual attendance entry for their session.

**FR10.2** A manual entry must require a reason.

**FR10.3** The system must record:

- Student
- Session
- Lecturer
- Timestamp
- Reason
- Attendance method = `MANUAL`

**FR10.4** Manual attendance shall count toward official attendance only after the lecturer explicitly confirms it.

**FR10.5** Manual attendance must remain distinguishable from QR/geolocation-verified attendance.

**FR10.6** The system shall track manual override frequency.

**FR10.7** Excessive manual overrides may be flagged for administrator/Administrator review.

**FR10.8** There shall be no assumption that manual attendance provides the same level of verification as automated attendance.

---

## 7.11 Parent/Guardian Module

**FR11.1** Parents/guardians must authenticate.

**FR11.2** A parent/guardian must be explicitly linked to one or more wards.

**FR11.3** Parent-ward linking shall be performed through an authorized workflow such as administrator linking or invitation/acceptance.

**FR11.4** Parents can view:

- Attendance percentage
- Attendance history
- Recent attendance activity
- Attendance verification method

**FR11.5** Parents cannot edit attendance.

**FR11.6** Parents cannot access unrelated student records.

---

## 7.12 Administrator and Administrator Module

### Administrator

Administrators can:

- Manage users
- Assign roles
- Manage departments
- Review audit logs
- Review suspicious activity
- Manage parent-ward relationships
- Generate reports
- Review system-level statistics

### Administrator

Administrators can:

- View department-level attendance
- View course attendance
- Review absenteeism patterns
- View attendance-performance summaries
- Review relevant suspicious/manual activity

Administrators must not automatically receive access to unrelated departments.

---

## 7.13 Academic Performance Management

### CSV Standard

The prototype shall use a defined CSV structure:

```csv
student_id,assessment_type,score,total_score
ST001,Quiz,15,20
ST002,Quiz,18,20
ST003,Quiz,12,20
```

**FR13.1** Lecturers can upload performance records for their courses.

**FR13.2** The system shall validate CSV headers.

**FR13.3** The system shall validate student identifiers.

**FR13.4** The system shall validate scores and total scores.

**FR13.5** Invalid rows shall be reported before final import.

**FR13.6** Successfully imported records shall be linked to the correct student and course.

**FR13.7** The system may provide a downloadable CSV template.

---

## 7.14 Academic Analytics

The system shall calculate, where sufficient data exists:

### Student-level

- Attendance percentage
- Sessions attended
- Sessions missed
- Verified attendance
- Manual attendance
- Average assessment score
- Performance trend

### Course-level

- Average attendance
- Average performance
- Attendance distribution
- Attendance trend
- Performance trend
- Attendance-performance correlation

### Department-level

- Course attendance comparison
- Attendance trends
- Course performance summaries
- Students requiring follow-up

**FR14.1** Pearson's correlation coefficient may be used when the dataset is suitable.

**FR14.2** The system shall not calculate or display misleading correlation results when there are insufficient observations.

**FR14.3** Correlation results must be clearly labeled as association/correlation, not causation.

**FR14.4** The system may flag combinations such as persistent low attendance and low performance for follow-up.

---

## 7.15 Anomaly Detection

The prototype shall include rule-based anomaly detection rather than requiring machine learning.

Examples:

**Rule A:** One device is repeatedly associated with multiple student accounts.

**Rule B:** A student has repeated out-of-range attempts.

**Rule C:** A student repeatedly submits attendance from locations with poor accuracy.

**Rule D:** A lecturer records an unusually high number of manual overrides.

**Rule E:** Repeated invalid or expired QR attempts occur for the same account/device.

Flagged anomalies shall be available to authorized staff for review.

The system shall present these as **alerts for investigation**, not automatic accusations of misconduct.

---

## 7.16 Reporting

**FR16.1** Administrators and Administrators can export relevant attendance reports.

**FR16.2** Lecturers can export course-level attendance information where authorized.

**FR16.3** Reports may be generated as CSV and PDF.

Reports may include:

- Student attendance percentage
- Sessions attended/missed
- Verification method
- Manual attendance count
- Course attendance statistics
- Attendance-performance summaries
- Suspicious activity summaries where authorized

---

# 8. Attendance Decision Model

Every attendance submission shall produce one of two broad outcomes:

### A. Verified Attendance

All required validation conditions pass.

```text
Authenticated
+ Active Session
+ Valid QR
+ Enrolled
+ Valid Time
+ Location Within Radius
+ Acceptable Accuracy
+ Device Valid
+ No Duplicate
= VERIFIED
```

### B. Failed/Flagged Attempt

One or more conditions fail.

```text
Validation Failure
       ↓
Record Attempt
       ↓
Assign Failure Reason
       ↓
Do Not Create Verified Attendance
       ↓
Optional Authorized Review
```

A manual exception, if approved, creates a separate `MANUAL` attendance record rather than changing the original automated verification result.

---

# 9. System Architecture

The system shall use a three-tier client-server architecture.

## 9.1 Presentation Tier

- Student responsive web interface
- Lecturer dashboard
- Administrator dashboard
- Administrator dashboard
- Parent/Guardian dashboard

## 9.2 Application/API Tier

- Authentication
- RBAC
- Session management
- Dynamic QR generation
- QR validation
- Geolocation validation
- Device binding
- Attendance engine
- Attempt logging
- Manual override workflow
- Anomaly detection
- CSV processing
- Analytics
- Reporting

## 9.3 Data Tier

Relational database containing:

- Users
- Departments
- Courses
- Enrollments
- Sessions
- QR tokens/validation metadata
- Attendance attempts
- Attendance records
- Device bindings
- Performance records
- Parent-ward relationships
- Audit logs

---

# 10. Core Data Model

| Entity | Key fields |
|---|---|
| Users | `user_id`, `full_name`, `email`, `role`, `status`, `created_at` |
| Departments | `department_id`, `name`, `hod_id` |
| Courses | `course_id`, `department_id`, `course_code`, `course_name` |
| Course Offerings | `offering_id`, `course_id`, `lecturer_id`, `semester`, `academic_year` |
| Enrollments | `enrollment_id`, `student_id`, `offering_id`, `status` |
| Class Sessions | `session_id`, `offering_id`, `lecturer_id`, `latitude`, `longitude`, `allowed_radius`, `start_time`, `end_time`, `status` |
| QR Tokens | `token_id`, `session_id`, `issued_at`, `expires_at`, `status` |
| Device Bindings | `device_id`, `user_id`, `device_identifier`, `registered_at`, `status` |
| Attendance Attempts | `attempt_id`, `session_id`, `student_id`, `timestamp`, `latitude`, `longitude`, `accuracy`, `distance`, `device_id`, `result`, `reason` |
| Attendance Records | `record_id`, `session_id`, `student_id`, `method`, `timestamp`, `status`, `approved_by` |
| Performance Records | `performance_id`, `student_id`, `offering_id`, `assessment_type`, `score`, `total_score`, `uploaded_at` |
| Parent-Ward Relationships | `parent_id`, `student_id`, `status`, `created_at` |
| Audit Logs | `log_id`, `user_id`, `action`, `target_type`, `target_id`, `timestamp`, `metadata` |

### Important Database Rules

1. `attendance_records` must have a unique constraint on `(session_id, student_id)`.
2. Foreign keys shall enforce valid relationships.
3. Attendance attempts and audit logs should be retained separately from official attendance.
4. Manual attendance must remain distinguishable by its `method`.
5. Sensitive data should not be exposed through unauthorized queries.

---

# 11. Security Requirements

1. All protected resources require authentication.
2. RBAC must be enforced on every protected endpoint.
3. QR tokens must be short-lived and cryptographically signed.
4. Server-side validation must be authoritative.
5. Database constraints must prevent duplicate official attendance.
6. Device binding must use platform-permitted application identifiers.
7. All API communication must use HTTPS.
8. Passwords must never be stored in plaintext.
9. Parent access must be restricted to linked wards.
10. Administrator access must be restricted to authorized departments.
11. Lecturers must only manage assigned courses/sessions.
12. Manual attendance actions must be auditable.
13. Failed/suspicious attendance attempts must not automatically become official attendance.
14. Location collection must occur only when needed for attendance verification.
15. Exact location data must not be exposed to users without authorization.
16. Sensitive data should be encrypted/protected at rest where supported by the deployment environment.
17. Authentication tokens must expire according to defined security rules.

---

# 12. Privacy Requirements

The system handles potentially sensitive academic and location information.

### Data Minimization

Only collect location when attendance is being verified.

### Access Limitation

- Students: own attendance.
- Lecturers: assigned courses.
- Parents: linked wards.
- Administrators: authorized department.
- Administrators: institution-level administrative scope.

### Location Data

The prototype shall document:

- Why location is collected.
- When it is collected.
- Who can access it.
- How long it is retained.
- When it is deleted/anonymized.

The system shall not perform continuous student location tracking.

---

# 13. Non-Functional Requirements

| Category | Prototype target |
|---|---|
| Attendance validation | Target response of approximately 3 seconds or less under normal network conditions |
| QR expiration | Configurable short interval |
| Duplicate prevention | No duplicate official attendance under controlled repeated submissions |
| Security | Unauthorized protected resources must be denied |
| Usability | Student check-in should normally complete within a few simple steps |
| Reliability | Repeated requests must not create duplicate records |
| Scalability | Database and API structure should support expansion beyond prototype data |
| Maintainability | Modules should be separated by responsibility |
| Accessibility | Interfaces should be usable on common smartphones and desktop browsers |
| Projector usability | Lecturer QR display must remain readable when projected |
| Auditability | Manual overrides and significant failed attempts must be traceable |

Performance targets are prototype evaluation targets and may be adjusted based on the actual test environment.

---

# 14. Threat Model

| Threat | Control |
|---|---|
| QR screenshot sharing | Short-lived rotating QR tokens |
| QR tampering | Cryptographic signature |
| Off-site attendance | Geolocation validation |
| GPS uncertainty | Location accuracy checks |
| Location spoofing | Multiple validation signals + anomaly logging |
| Duplicate scans | Application check + database unique constraint |
| Shared device | Device binding + anomaly detection |
| Unauthorized dashboard access | Authentication + RBAC |
| Parent accessing another student | Parent-ward authorization |
| Lecturer abusing manual overrides | Required reason + audit log + monitoring |
| Invalid CSV data | Validation and error reporting |
| Replay attempts | Token expiration + server-side validation |
| Data exposure | Scoped authorization + HTTPS + protected storage |

The controls reduce risk but do not guarantee perfect fraud prevention.

---

# 15. Offline and Network Strategy

The prototype will use an **online-first attendance verification model**.

A live network connection is required for normal QR attendance because the server must validate:

- QR token
- Session status
- Enrollment
- Duplicate status
- Device binding
- Attendance state

If a student cannot complete automated verification because of connectivity or device problems, the defined lecturer-assisted manual exception process may be used.

The prototype will not implement fully offline attendance synchronization.

---

# 16. Success Metrics

The prototype shall be evaluated using measurable tests.

### Security/Integrity

- 100% of controlled duplicate submissions must fail to create duplicate official records.
- Expired QR tokens must not create verified attendance.
- Tampered QR tokens must not create verified attendance.
- Unauthorized role access must be denied.
- Parent accounts must not access unrelated students.
- Out-of-range automated submissions must not create verified attendance.

### Functional

- Valid students can successfully check in.
- Lecturers can start/end sessions.
- QR codes rotate/expire correctly.
- Manual exceptions are logged.
- CSV results can be validated and imported.
- Analytics can be generated from valid data.

### Fraud-Reduction Evaluation

Controlled tests should include:

1. QR screenshot reuse.
2. Expired QR scan.
3. Off-site scan.
4. Duplicate scan.
5. Shared-device attempt.
6. Invalid QR token.
7. Wrong-course student.
8. Excessive manual overrides.

Results shall be reported as measured test outcomes rather than absolute claims of fraud prevention.

### Usability

Stakeholders should evaluate:

- Ease of attendance submission.
- Time required to check in.
- Clarity of error messages.
- Lecturer session management.
- Dashboard usefulness.

---

# 17. Testing Plan

## 17.1 Functional Tests

| Test | Expected result |
|---|---|
| Valid QR + valid location | Attendance accepted |
| Expired QR | Rejected |
| Invalid signature | Rejected |
| Inactive session | Rejected |
| Student not enrolled | Rejected |
| Outside radius | Rejected and logged |
| Poor location accuracy | Rejected/flagged according to rule |
| Duplicate scan | Rejected |
| Valid manual override | Manual record created and audited |
| Missing manual reason | Action blocked |
| Unauthorized dashboard | Access denied |
| Parent accesses unrelated student | Access denied |
| Valid CSV | Imported |
| Invalid CSV | Validation error |
| Device associated with multiple accounts | Flag generated |

## 17.2 Security Tests

- RBAC testing
- Authentication testing
- Session/token expiration
- QR tampering
- QR replay
- Duplicate request testing
- Unauthorized API requests
- Parent/ward authorization
- Lecturer resource ownership
- Audit-log verification

## 17.3 Analytics Tests

- Attendance percentage calculation
- Average score calculation
- Missing data handling
- Correlation calculation
- Insufficient-data handling
- Chart accuracy
- CSV import accuracy

---

# 18. Risks and Limitations

| Risk | Mitigation |
|---|---|
| GPS spoofing | Layered controls and anomaly detection |
| GPS inaccuracy | Accuracy threshold and exception workflow |
| Poor connectivity | Clear failure state and manual exception |
| Students without smartphones | Controlled manual fallback |
| Shared devices | Device binding and anomaly detection |
| Manual attendance abuse | Required reason, audit log, monitoring |
| QR screenshot sharing | Short-lived rotating tokens |
| CSV errors | Standard template and validation |
| Privacy concerns | Data minimization and role-based access |
| Device reset/replacement | Defined device recovery process |
| False positives | Reviewable alerts rather than automatic accusations |
| Limited prototype sample | Clearly document prototype evaluation scope |

---

# 19. Development Phases

## Phase 1: Requirements Analysis

- Confirm stakeholders.
- Confirm attendance workflow.
- Confirm academic structure.
- Define security and privacy requirements.
- Define test scenarios.

## Phase 2: System Design

- Database ERD.
- API design.
- Authentication/RBAC design.
- Attendance decision workflow.
- QR architecture.
- Geolocation workflow.
- UI wireframes.

## Phase 3: Core Implementation

1. Authentication
2. Roles/RBAC
3. Departments/courses
4. Student enrollment
5. Lecturer sessions
6. Dynamic QR
7. Student scanning
8. Geolocation validation
9. Device binding
10. Duplicate prevention

## Phase 4: Audit and Exception Features

- Attendance attempts
- Manual attendance
- Audit logs
- Suspicious activity
- Anomaly rules

## Phase 5: Analytics

- CSV import
- Performance records
- Attendance statistics
- Correlation
- Charts
- Reports

## Phase 6: Testing

- Functional testing
- Security testing
- Integration testing
- Performance testing
- Analytics testing
- Usability testing

## Phase 7: Evaluation

- Controlled fraud scenarios
- Stakeholder feedback
- Performance measurements
- Limitations
- Results and discussion

---

# 20. Recommended Technology Stack

The prototype should use a concrete stack rather than multiple alternatives.

| Component | Recommended technology |
|---|---|
| Frontend | React |
| Backend/API | Laravel REST API |
| Database | MySQL |
| Authentication | Laravel authentication/token system |
| QR generation | Server-side QR library |
| QR security | HMAC/signed short-lived tokens |
| Geolocation | Browser Geolocation API |
| Distance calculation | Haversine formula |
| Charts | Recharts or Chart.js |
| CSV processing | Laravel/PHP CSV processing |
| Reports | PDF/CSV generation |
| Version control | GitHub |
| Transport security | HTTPS |

The exact libraries may change during implementation without changing the product requirements.

---

# 21. API-Level Conceptual Endpoints

The following endpoints describe the expected responsibilities rather than prescribing exact implementation syntax.

### Authentication

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Courses and Enrollment

```text
GET  /courses
GET  /courses/{id}
GET  /courses/{id}/students
```

### Sessions

```text
POST /sessions
POST /sessions/{id}/start
POST /sessions/{id}/end
GET  /sessions/{id}
GET  /sessions/{id}/attendance
```

### QR

```text
GET /sessions/{id}/qr
POST /attendance/validate-qr
```

### Attendance

```text
POST /attendance/check-in
GET  /students/{id}/attendance
GET  /courses/{id}/attendance
```

### Manual Attendance

```text
POST /attendance/manual
GET  /attendance/manual
```

### Analytics

```text
POST /performance/import
GET  /courses/{id}/analytics
GET  /students/{id}/analytics
```

### Administration

```text
GET  /audit-logs
GET  /anomalies
GET  /reports
```

---

# 22. Key Business Rules

1. A student cannot receive verified attendance without authentication.
2. A student cannot receive verified attendance without valid course enrollment.
3. An expired QR cannot create verified attendance.
4. An invalid/tampered QR cannot create verified attendance.
5. A student outside the allowed radius cannot automatically receive verified attendance.
6. Poor location accuracy may prevent automated verification.
7. A student cannot have two official attendance records for the same session.
8. Manual attendance must be explicitly identified as manual.
9. Manual attendance requires a reason.
10. Manual attendance does not erase the original failed automated attempt.
11. Parents can only view linked wards.
12. Lecturers can only manage assigned courses.
13. Administrators can only access authorized department information.
14. Administrators can access system-level administrative functions.
15. Alerts indicate activity requiring review and do not automatically establish misconduct.
16. Attendance-performance analytics describe relationships and must not be presented as proof of causation.

---

# 23. Decisions

The following decisions are part of the revised PRD:

1. Automated attendance uses layered verification.
2. Out-of-range automated attendance is rejected and logged rather than automatically accepted.
3. Failed attempts are stored separately from official attendance.
4. Manual attendance is available as a controlled exception.
5. Every manual attendance entry requires a reason and audit trail.
6. Manual attendance remains distinguishable from QR/geolocation-verified attendance.
7. Excessive manual overrides can generate an administrative/Administrator alert.
8. A standard CSV template is used for the prototype.
9. Student-course enrollment is an explicit database relationship.
10. Attendance attempts are stored separately from official attendance records.
11. Audit logs are maintained for important administrative and attendance actions.
12. Device binding is treated as a supporting security signal, not proof of identity.
13. The prototype is online-first rather than fully offline.
14. Correlation analysis must not be presented as causal analysis.
15. Anomaly detection is rule-based for the prototype.
16. The project measures fraud-reduction effectiveness through controlled testing rather than claiming absolute prevention.

---

# 24. Final Prototype Scope

The minimum complete prototype shall contain:

### Student
- Login
- Course attendance
- QR scanner
- Location verification
- Device binding
- Attendance history

### Lecturer
- Login
- Course management
- Session creation
- Dynamic QR
- Live attendance
- Failed-attempt review
- Manual exception attendance
- CSV results upload
- Course analytics

### Parent
- Login
- Ward selection
- Attendance history
- Attendance percentage

### Administrator
- Department dashboard
- Course attendance
- Attendance trends
- Performance summaries
- Relevant alerts

### Administrator
- User/role management
- Department/course management
- Audit logs
- Suspicious activity
- Reports

### System
- Dynamic QR
- Geolocation
- Authentication
- RBAC
- Device binding
- Duplicate prevention
- Attempt logging
- Audit logging
- Anomaly detection
- Academic analytics
- Reporting

---

## 25. Project Contribution

The project is not positioned merely as a QR attendance application.

Its technical contribution is the combination of:

> **Dynamic QR verification + geolocation + authenticated identity + device binding + database integrity + auditability + academic performance analytics**

The evaluation will determine how effectively these controls reduce common attendance manipulation scenarios in the prototype environment.
