<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ClassSession;
use App\Models\CourseOffering;
use App\Models\QRToken;
use App\Models\AttendanceRecord;
use App\Models\Enrollment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;

class SessionController extends Controller
{
    /**
     * Start a new class session and generate the first QR token.
     */
    public function start(Request $request)
    {
        $request->validate([
            'course_offering_id' => 'required|uuid|exists:course_offerings,id',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'allowed_radius' => 'nullable|numeric'
        ]);

        $user = $request->user() ?: Auth::user();

        // Enforce Role
        if (!$user || ($user->role !== 'LECTURER' && $user->role !== 'SUPER_ADMIN' && $user->role !== 'HOD')) {
            return response()->json(['message' => 'Unauthorized action. Lecturers and HODs only.'], 403);
        }

        // Verify Lecturer teaches this offering
        $offering = CourseOffering::findOrFail($request->course_offering_id);
        if (in_array($user->role, ['LECTURER', 'HOD']) && $offering->lecturer_id !== $user->id) {
            return response()->json(['message' => 'You are not assigned to teach this course.'], 403);
        }

        // Create the active ClassSession
        $session = ClassSession::create([
            'course_offering_id' => $offering->id,
            'lecturer_id' => $user->id,
            'latitude' => $request->filled('latitude') ? (float) $request->latitude : 5.5545,
            'longitude' => $request->filled('longitude') ? (float) $request->longitude : -0.1902,
            'allowed_radius' => $request->allowed_radius ?? 50.0,
            'start_time' => Carbon::now(),
            'status' => 'ACTIVE'
        ]);

        // Generate the first rotating QR Token (valid for 15 seconds)
        $qrToken = $this->generateQR($session->id, 15);

        return response()->json([
            'message' => 'Class session started.',
            'session' => $session,
            'qr_token' => $qrToken
        ], 201);
    }

    /**
     * Rotate the QR token (Requested periodically by the Lecturer's React app).
     */
    public function rotateQR(Request $request, $sessionId)
    {
        $session = ClassSession::findOrFail($sessionId);
        $user = $request->user() ?: Auth::user();

        // Security check
        if ($user && in_array($user->role, ['LECTURER', 'HOD']) && $session->lecturer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($session->status !== 'ACTIVE') {
            return response()->json(['message' => 'Cannot rotate QR for an inactive session.'], 400);
        }

        // Expire all active tokens for this session
        QRToken::where('class_session_id', $session->id)
               ->where('status', 'ACTIVE')
               ->update(['status' => 'EXPIRED']);

        // Generate new token (valid for 15 seconds)
        $qrToken = $this->generateQR($session->id, 15);

        return response()->json([
            'message' => 'QR rotated successfully.',
            'qr_token' => $qrToken
        ]);
    }

    /**
     * Helper to generate a rotating QR token.
     */
    private function generateQR($sessionId, $seconds = 15)
    {
        $issuedAt = Carbon::now();
        $expiresAt = $issuedAt->copy()->addSeconds($seconds);
        $signature = hash_hmac('sha256', $sessionId . '-' . $issuedAt->timestamp . '-' . Str::random(16), config('app.key') ?: 'countme_secret');

        return QRToken::create([
            'class_session_id' => $sessionId,
            'signature'        => $signature,
            'issued_at'        => $issuedAt,
            'expires_at'       => $expiresAt,
            'status'           => 'ACTIVE'
        ]);
    }

    /**
     * End the class session.
     */
    public function end(Request $request, $sessionId)
    {
        $session = ClassSession::findOrFail($sessionId);

        if (in_array(Auth::user()->role, ['LECTURER', 'HOD']) && $session->lecturer_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $session->update([
            'end_time' => Carbon::now(),
            'status' => 'ENDED'
        ]);

        // Expire tokens
        QRToken::where('class_session_id', $session->id)
               ->where('status', 'ACTIVE')
               ->update(['status' => 'EXPIRED']);

        return response()->json(['message' => 'Class session ended successfully.', 'session' => $session]);
    }

    /**
     * Get session history for the authenticated lecturer.
     */
    public function history(Request $request)
    {
        $user = $request->user();
        $query = ClassSession::with('offering.course')
            ->where('lecturer_id', $user->id)
            ->orderBy('start_time', 'desc');

        if ($request->filled('date')) {
            $query->whereDate('start_time', $request->date);
        }

        if ($request->filled('offering_id')) {
            $query->where('course_offering_id', $request->offering_id);
        }

        if ($request->filled('level')) {
            $level = (int) $request->level;
            $query->whereHas('offering.course', fn($q) => $q->where('level', $level));
        }

        if ($request->filled('semester')) {
            $sem = (int) $request->semester;
            $query->whereHas('offering', function ($oq) use ($sem) {
                $oq->where('semester', (string) $sem)
                   ->orWhere('semester', $sem)
                   ->orWhereHas('course', fn($cq) => $cq->where('semester', $sem));
            });
        }

        $sessions = $query->get()
            ->map(function ($s) {
                $present = AttendanceRecord::where('class_session_id', $s->id)->where('status', 'PRESENT')->count();
                $enrolled = Enrollment::where('course_offering_id', $s->course_offering_id)->where('status', 'ACTIVE')->count();
                $duration = $s->end_time && $s->start_time ? (int) $s->start_time->diffInMinutes($s->end_time) : null;
                return [
                    'id'                 => $s->id,
                    'course_offering_id' => $s->course_offering_id,
                    'course_code'        => $s->offering->course->course_code ?? '—',
                    'course_name'        => $s->offering->course->course_name ?? '—',
                    'level'              => $s->offering->course->level ?? 100,
                    'semester'           => (int) ($s->offering->semester ?? $s->offering->course->semester ?? 1),
                    'start_time'         => $s->start_time,
                    'end_time'           => $s->end_time,
                    'duration_min'       => $duration,
                    'status'             => $s->status,
                    'present'            => $present,
                    'enrolled'           => $enrolled,
                ];
            });

        return response()->json($sessions);
    }

    /**
     * Search and filter individual student attendance records.
     */
    public function records(Request $request)
    {
        $user = $request->user();

        $query = AttendanceRecord::with([
            'student:id,name,index_number,level',
            'session.offering.course'
        ])
        ->whereHas('session', function ($q) use ($user) {
            $q->where('lecturer_id', $user->id);
        });

        // Filter by date (YYYY-MM-DD)
        if ($request->filled('date')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->whereDate('start_time', $request->date);
            });
        }

        // Filter by course offering
        if ($request->filled('offering_id')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->where('course_offering_id', $request->offering_id);
            });
        }

        // Filter by course level (or student level)
        if ($request->filled('level')) {
            $level = (int) $request->level;
            $query->where(function ($q) use ($level) {
                $q->whereHas('student', fn($sq) => $sq->where('level', $level))
                  ->orWhereHas('session.offering.course', fn($cq) => $cq->where('level', $level));
            });
        }

        // Filter by semester (1 or 2)
        if ($request->filled('semester')) {
            $sem = (int) $request->semester;
            $query->whereHas('session.offering', function ($oq) use ($sem) {
                $oq->where('semester', (string) $sem)
                   ->orWhere('semester', $sem)
                   ->orWhereHas('course', fn($cq) => $cq->where('semester', $sem));
            });
        }

        // Search by student name or index number
        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->whereHas('student', function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('index_number', 'like', "%{$term}%");
            });
        }

        $records = $query->orderBy('created_at', 'desc')
            ->limit(500)
            ->get()
            ->map(fn($r) => [
                'id'                 => $r->id,
                'student_name'       => $r->student->name ?? '—',
                'index_number'       => $r->student->index_number ?? '—',
                'level'              => $r->student->level ?? ($r->session->offering->course->level ?? 100),
                'semester'           => (int) ($r->session->offering->semester ?? $r->session->offering->course->semester ?? 1),
                'course_code'        => $r->session->offering->course->course_code ?? '—',
                'course_name'        => $r->session->offering->course->course_name ?? '—',
                'course_offering_id' => $r->session->course_offering_id ?? null,
                'session_id'         => $r->class_session_id,
                'session_date'       => $r->session->start_time ? $r->session->start_time->toIso8601String() : null,
                'status'             => $r->status,
                'method'             => $r->method,
                'checked_in_at'      => $r->created_at ? $r->created_at->toIso8601String() : null,
            ]);

        return response()->json($records);
    }

    /**
     * Get attendance roster for a specific session.
     */
    public function sessionAttendance($id, Request $request)
    {
        $user = $request->user();
        $session = ClassSession::with('offering.course')
            ->where('id', $id)
            ->where('lecturer_id', $user->id)
            ->firstOrFail();

        $records = AttendanceRecord::with('student:id,name,index_number')
            ->where('class_session_id', $session->id)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->student->name ?? '—',
                'index_number' => $r->student->index_number ?? '—',
                'method' => $r->method,
                'status' => $r->status,
                'checked_in_at' => $r->created_at,
            ]);

        return response()->json([
            'session' => [
                'id' => $session->id,
                'course_code' => $session->offering->course->course_code ?? '—',
                'course_name' => $session->offering->course->course_name ?? '—',
                'start_time' => $session->start_time,
                'end_time' => $session->end_time,
            ],
            'records' => $records
        ]);
    }

    /**
     * Get aggregate semester-wide attendance report across all sessions for an offering.
     */
    public function exportSemesterAttendance(Request $request, CourseOffering $offering)
    {
        $user = $request->user();
        if ($user->role === 'LECTURER' && $offering->lecturer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        if ($user->role === 'HOD' && $offering->course && $offering->course->department_id !== $user->department_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $sessions = ClassSession::where('course_offering_id', $offering->id)
            ->orderBy('start_time', 'asc')
            ->get();

        $totalSessions = $sessions->count();
        $sessionIds = $sessions->pluck('id');

        // Retrieve enrolled students or students in the department
        $enrollments = Enrollment::where('course_offering_id', $offering->id)
            ->with('student')
            ->get();

        $students = collect();
        if ($enrollments->count() > 0) {
            $students = $enrollments->map(fn($e) => $e->student)->filter();
        } else if ($offering->course && $offering->course->department_id) {
            $students = \App\Models\Student::where('department_id', $offering->course->department_id)->get();
        }

        // Attendance records for all sessions in this offering
        $records = AttendanceRecord::whereIn('class_session_id', $sessionIds)
            ->where('status', 'PRESENT')
            ->get();

        $attendanceGrid = [];
        foreach ($records as $rec) {
            $attendanceGrid[$rec->student_id][$rec->class_session_id] = true;
        }

        $report = $students->map(function ($stu) use ($totalSessions, $sessions, $attendanceGrid) {
            $presentCount = 0;
            $sessionBreakdown = [];

            foreach ($sessions as $s) {
                $wasPresent = isset($attendanceGrid[$stu->id][$s->id]);
                if ($wasPresent) $presentCount++;
                $sessionBreakdown[] = [
                    'session_id' => $s->id,
                    'date'       => $s->start_time ? $s->start_time->format('Y-m-d') : '—',
                    'present'    => $wasPresent,
                ];
            }

            $rate = $totalSessions > 0 ? round(($presentCount / $totalSessions) * 100, 1) : 0;
            $eligibility = $rate >= 75 ? 'ELIGIBLE' : 'AT_RISK';

            return [
                'student_id'        => $stu->id,
                'name'              => $stu->name,
                'index_number'      => $stu->index_number,
                'level'             => $stu->level ?? 100,
                'total_sessions'    => $totalSessions,
                'sessions_present'  => $presentCount,
                'attendance_rate'   => $rate,
                'eligibility'       => $eligibility,
                'sessions'          => $sessionBreakdown,
            ];
        })->sortByDesc('attendance_rate')->values();

        return response()->json([
            'course' => [
                'id'            => $offering->id,
                'code'          => $offering->course->course_code ?? '—',
                'name'          => $offering->course->course_name ?? '—',
                'semester'      => $offering->semester,
                'academic_year' => $offering->academic_year,
            ],
            'total_sessions' => $totalSessions,
            'session_dates'  => $sessions->map(fn($s) => $s->start_time ? $s->start_time->format('Y-m-d') : '—'),
            'students'       => $report,
        ]);
    }
}
