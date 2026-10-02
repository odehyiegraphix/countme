<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\CourseOffering;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    // ─── OVERVIEW ────────────────────────────────────────────────────────────

    public function stats()
    {
        $user = auth()->user();
        $deptId = $user->role === 'HOD' ? $user->department_id : null;

        $totalStudentsQuery = \App\Models\Student::query();
        if ($deptId) $totalStudentsQuery->where('department_id', $deptId);
        $totalStudents = $totalStudentsQuery->count();

        $totalLecturersQuery = User::where('role', 'LECTURER')->where('status', 'ACTIVE');
        if ($deptId) $totalLecturersQuery->where('department_id', $deptId);
        $totalLecturers = $totalLecturersQuery->count();

        $totalCoursesQuery = CourseOffering::query();
        if ($deptId) {
            $totalCoursesQuery->whereHas('course', function ($q) use ($deptId) {
                $q->where('department_id', $deptId);
            });
        }
        $totalCourses = $totalCoursesQuery->count();

        $totalDepts = Department::count();
        
        $activeSessionsQuery = ClassSession::where('status', 'ACTIVE');
        if ($deptId) {
            $activeSessionsQuery->whereHas('offering.course', function ($q) use ($deptId) {
                $q->where('department_id', $deptId);
            });
        }
        $activeSessions = $activeSessionsQuery->count();

        $endedSessionIdsQuery = ClassSession::where('status', 'ENDED');
        if ($deptId) {
            $endedSessionIdsQuery->whereHas('offering.course', function ($q) use ($deptId) {
                $q->where('department_id', $deptId);
            });
        }
        $endedSessionIds = $endedSessionIdsQuery->pluck('id');
        
        $totalPresent    = 0;
        $totalExpected   = 0;

        if ($endedSessionIds->count() > 0) {
            $totalPresent  = AttendanceRecord::whereIn('class_session_id', $endedSessionIds)
                ->where('status', 'PRESENT')->count();
            $totalExpected = DB::table('class_sessions as cs')
                ->join('enrollments as e', 'e.course_offering_id', '=', 'cs.course_offering_id')
                ->where('cs.status', 'ENDED')
                ->where('e.status', 'ACTIVE')
                ->whereIn('cs.id', $endedSessionIds)
                ->count();
        }

        $attendanceRate = $totalExpected > 0
            ? round($totalPresent / $totalExpected * 100, 1)
            : null;

        $atRiskCount = $this->buildAtRiskCollection()->count();

        $trendQuery = ClassSession::where('status', 'ENDED')
            ->where('start_time', '>=', Carbon::now()->subDays(29)->startOfDay());
        if ($deptId) {
            $trendQuery->whereHas('offering.course', function ($q) use ($deptId) {
                $q->where('department_id', $deptId);
            });
        }
        
        $trend = $trendQuery->selectRaw("DATE(start_time) as date, COUNT(*) as sessions")
            ->groupBy('date')->orderBy('date')->get()
            ->map(fn($r) => ['date' => $r->date, 'sessions' => (int) $r->sessions]);

        return response()->json([
            'total_students'  => $totalStudents,
            'total_lecturers' => $totalLecturers,
            'total_courses'   => $totalCourses,
            'total_depts'     => $totalDepts,
            'active_sessions' => $activeSessions,
            'attendance_rate' => $attendanceRate,
            'at_risk_count'   => $atRiskCount,
            'trend'           => $trend,
        ]);
    }

    // ─── LIVE SESSIONS ────────────────────────────────────────────────────────

    public function liveSessions()
    {
        $user = auth()->user();
        $query = ClassSession::where('status', 'ACTIVE')
            ->with(['offering.course', 'lecturer:id,name,email'])
            ->orderBy('start_time', 'desc');
            
        if ($user->role === 'HOD') {
            $query->whereHas('offering.course', function ($q) use ($user) {
                $q->where('department_id', $user->department_id);
            });
        }

        $sessions = $query->get()
            ->map(function ($s) {
                $present  = AttendanceRecord::where('class_session_id', $s->id)->where('status', 'PRESENT')->count();
                $enrolled = Enrollment::where('course_offering_id', $s->course_offering_id)->where('status', 'ACTIVE')->count();
                return [
                    'id'          => $s->id,
                    'course_code' => $s->offering->course->course_code ?? '—',
                    'course_name' => $s->offering->course->course_name ?? '—',
                    'lecturer'    => $s->lecturer->name ?? '—',
                    'start_time'  => $s->start_time,
                    'present'     => $present,
                    'enrolled'    => $enrolled,
                    'radius'      => $s->allowed_radius,
                ];
            });
        return response()->json($sessions);
    }

    // ─── AT-RISK ─────────────────────────────────────────────────────────────

    public function atRiskStudents()
    {
        return response()->json($this->buildAtRiskCollection()->values());
    }

    // ─── USERS ───────────────────────────────────────────────────────────────

    public function listUsers(Request $request)
    {
        $query = User::query();

        $user = auth()->user();
        if ($user->role === 'HOD') {
            $query->where('department_id', $user->department_id)
                  ->whereIn('role', ['LECTURER', 'PARENT']);
        } else {
            if ($request->role && in_array($request->role, ['SUPER_ADMIN', 'HOD', 'LECTURER', 'PARENT'])) {
                $query->where('role', $request->role);
            }
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        return response()->json($query->orderBy('name')->get(['id', 'name', 'email', 'role', 'status', 'created_at']));
    }

    public function createUser(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|in:SUPER_ADMIN,HOD,LECTURER,PARENT',
        ]);

        $user = auth()->user();
        
        if ($user->role === 'HOD' && in_array($request->role, ['SUPER_ADMIN', 'HOD'])) {
            return response()->json(['message' => 'Unauthorized role assignment.'], 403);
        }

        $deptId = $user->role === 'HOD' ? $user->department_id : $request->department_id;
        // Super admin must provide department_id if creating HOD or Lecturer, handled in frontend.

        $newUser = User::create([
            'name'          => $request->name,
            'email'         => $request->email,
            'password'      => Hash::make($request->password),
            'role'          => $request->role,
            'department_id' => $deptId,
            'status'        => 'ACTIVE',
        ]);

        return response()->json($newUser, 201);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => "sometimes|email|unique:users,email,{$id}",
            'role'  => 'sometimes|in:SUPER_ADMIN,HOD,LECTURER,PARENT,STUDENT',
            'department_id' => 'sometimes|nullable|uuid|exists:departments,id',
        ]);
        $user->update($request->only(['name', 'email', 'role', 'department_id']));
        return response()->json($user);
    }

    public function toggleUserStatus($id)
    {
        $user = User::findOrFail($id);
        $user->status = $user->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        $user->save();
        return response()->json(['status' => $user->status]);
    }

    // ─── STUDENTS ────────────────────────────────────────────────────────────

    public function listStudents(Request $request)
    {
        $user = auth()->user();
        if ($user->role !== 'HOD') {
            return response()->json(['message' => 'Only HOD can view students directly.'], 403);
        }

        $query = \App\Models\Student::where('department_id', $user->department_id);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('index_number', 'like', "%{$request->search}%");
            });
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function uploadStudents(Request $request)
    {
        $user = auth()->user();
        if ($user->role !== 'HOD') {
            return response()->json(['message' => 'Only HOD can upload students.'], 403);
        }

        $request->validate([
            'level' => 'required|integer',
            'file'  => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        
        $header = fgetcsv($handle); // skip header or parse it
        // Ensure header contains name and index_number
        // Assuming column 0 is name, column 1 is index_number (or vice versa based on exact header)
        // For simplicity, let's assume the CSV is clean: name, index_number
        
        $offerings = \App\Models\CourseOffering::whereHas('course', function ($q) use ($user, $request) {
            $q->where('department_id', $user->department_id)
              ->where('level', $request->level);
        })->get();

        $count = 0;
        while (($data = fgetcsv($handle)) !== FALSE) {
            if (count($data) >= 2) {
                $student = \App\Models\Student::updateOrCreate(
                    ['index_number' => trim($data[1])],
                    [
                        'name' => trim($data[0]),
                        'department_id' => $user->department_id,
                        'level' => $request->level,
                    ]
                );
                
                foreach ($offerings as $offering) {
                    \App\Models\Enrollment::updateOrCreate(
                        [
                            'student_id' => $student->id,
                            'course_offering_id' => $offering->id
                        ],
                        [
                            'status' => 'ACTIVE'
                        ]
                    );
                }
                
                $count++;
            }
        }
        fclose($handle);

        return response()->json(['message' => "Uploaded $count students successfully"]);
    }

    // ─── DEPARTMENTS ─────────────────────────────────────────────────────────

    public function listDepartments()
    {
        return response()->json(
            Department::with('hod:id,name')->withCount('courses')->orderBy('name')->get()
        );
    }

    public function createDepartment(Request $request)
    {
        $request->validate([
            'name'   => 'required|string|max:255',
            'hod_id' => 'nullable|uuid|exists:users,id',
        ]);
        $dept = Department::create($request->only(['name', 'hod_id']));
        return response()->json($dept->load('hod:id,name'), 201);
    }

    public function updateDepartment(Request $request, $id)
    {
        $dept = Department::findOrFail($id);
        $request->validate([
            'name'   => 'sometimes|string|max:255',
            'hod_id' => 'nullable|uuid|exists:users,id',
        ]);
        $dept->update($request->only(['name', 'hod_id']));
        return response()->json($dept->load('hod:id,name'));
    }

    // ─── COURSES ─────────────────────────────────────────────────────────────

    public function listCourses()
    {
        $user = auth()->user();
        $query = Course::with('department:id,name')
                ->withCount('offerings')
                ->orderBy('course_code');
                
        if ($user->role === 'HOD') {
            $query->where('department_id', $user->department_id);
        }

        return response()->json($query->get());
    }

    public function createCourse(Request $request)
    {
        $user = auth()->user();
        
        $request->validate([
            'department_id' => $user->role === 'HOD' ? 'nullable' : 'required|uuid|exists:departments,id',
            'course_code'   => 'required|string|max:20|unique:courses,course_code',
            'course_name'   => 'required|string|max:255',
            'credit_hours'  => 'required|integer|min:1|max:12',
            'level'         => 'required|integer',
            'semester'      => 'required|integer',
        ]);
        
        $deptId = $user->role === 'HOD' ? $user->department_id : $request->department_id;
        
        $course = Course::create([
            'department_id' => $deptId,
            'course_code' => $request->course_code,
            'course_name' => $request->course_name,
            'credit_hours' => $request->credit_hours,
            'level' => $request->level,
            'semester' => $request->semester
        ]);
        return response()->json($course->load('department:id,name'), 201);
    }

    public function updateCourse(Request $request, $id)
    {
        $course = Course::findOrFail($id);
        $request->validate([
            'department_id' => 'sometimes|uuid|exists:departments,id',
            'course_code'   => "sometimes|string|max:20|unique:courses,course_code,{$id}",
            'course_name'   => 'sometimes|string|max:255',
            'credit_hours'  => 'sometimes|integer|min:1|max:12',
        ]);
        $course->update($request->only(['department_id', 'course_code', 'course_name', 'credit_hours']));
        return response()->json($course->load('department:id,name'));
    }

    public function deleteCourse($id)
    {
        $course = Course::findOrFail($id);
        $course->delete();
        return response()->json(['message' => 'Course deleted successfully']);
    }

    // ─── OFFERINGS ───────────────────────────────────────────────────────────

    public function listOfferings()
    {
        $user = auth()->user();
        $query = CourseOffering::with(['course.department', 'lecturer:id,name,email'])
            ->withCount(['enrollments as enrolled_count' => fn($q) => $q->where('status', 'ACTIVE')])
            ->withCount('classSessions as session_count')
            ->orderByDesc('created_at');

        if ($user->role === 'HOD') {
            $query->whereHas('course', function ($q) use ($user) {
                $q->where('department_id', $user->department_id);
            });
        }

        $offerings = $query->get()
            ->map(fn($o) => [
                'id'            => $o->id,
                'course_code'   => $o->course->course_code,
                'course_name'   => $o->course->course_name,
                'department'    => $o->course->department->name ?? '—',
                'lecturer_id'   => $o->lecturer_id,
                'lecturer_name' => $o->lecturer->name ?? '—',
                'semester'      => $o->semester,
                'academic_year' => $o->academic_year,
                'enrolled'      => $o->enrolled_count,
                'sessions'      => $o->session_count,
            ]);
        return response()->json($offerings);
    }

    public function createOffering(Request $request)
    {
        $request->validate([
            'course_id'     => 'required|uuid|exists:courses,id',
            'lecturer_id'   => 'required|uuid|exists:users,id',
            'semester'      => 'required|string|max:50',
            'academic_year' => 'required|string|max:20',
        ]);
        $offering = CourseOffering::create($request->only(['course_id', 'lecturer_id', 'semester', 'academic_year']));
        return response()->json($offering->load(['course', 'lecturer:id,name']), 201);
    }

    public function deleteOffering($id)
    {
        $offering = CourseOffering::findOrFail($id);
        $offering->delete();
        return response()->json(['message' => 'Offering removed.']);
    }

    // ─── SESSION HISTORY ─────────────────────────────────────────────────────

    public function listSessions(Request $request)
    {
        $user = auth()->user();
        $query = ClassSession::with(['offering.course', 'lecturer:id,name'])
            ->orderBy('start_time', 'desc');

        if ($user->role === 'HOD') {
            $query->whereHas('offering.course', function ($q) use ($user) {
                $q->where('department_id', $user->department_id);
            });
        }

        if ($request->status && in_array($request->status, ['ACTIVE', 'ENDED'])) {
            $query->where('status', $request->status);
        }
        if ($request->offering_id) {
            $query->where('course_offering_id', $request->offering_id);
        }
        if ($request->filled('semester')) {
            $sem = (int) $request->semester;
            $query->whereHas('offering', function ($oq) use ($sem) {
                $oq->where('semester', (string) $sem)
                   ->orWhere('semester', $sem)
                   ->orWhereHas('course', fn($cq) => $cq->where('semester', $sem));
            });
        }
        if ($request->filled('level')) {
            $level = (int) $request->level;
            $query->whereHas('offering.course', fn($cq) => $cq->where('level', $level));
        }
        if ($request->filled('date')) {
            $query->whereDate('start_time', $request->date);
        }

        return response()->json(
            $query->limit(200)->get()->map(function ($s) {
                $present  = AttendanceRecord::where('class_session_id', $s->id)->where('status', 'PRESENT')->count();
                $enrolled = Enrollment::where('course_offering_id', $s->course_offering_id)->where('status', 'ACTIVE')->count();
                $duration = $s->end_time ? (int) $s->start_time->diffInMinutes($s->end_time) : null;
                return [
                    'id'           => $s->id,
                    'course_code'  => $s->offering->course->course_code ?? '—',
                    'course_name'  => $s->offering->course->course_name ?? '—',
                    'level'        => $s->offering->course->level ?? 100,
                    'semester'     => (int) ($s->offering->semester ?? $s->offering->course->semester ?? 1),
                    'lecturer'     => $s->lecturer->name ?? '—',
                    'start_time'   => $s->start_time,
                    'end_time'     => $s->end_time,
                    'duration_min' => $duration,
                    'status'       => $s->status,
                    'present'      => $present,
                    'enrolled'     => $enrolled,
                ];
            })
        );
    }

    // ─── ATTENDANCE RECORDS ──────────────────────────────────────────────────

    public function listAttendance(Request $request)
    {
        $user = auth()->user();
        $query = AttendanceRecord::with(['student:id,name,index_number,level', 'session.offering.course'])
            ->where('status', 'PRESENT')
            ->orderBy('created_at', 'desc');

        if ($user->role === 'HOD') {
            $query->whereHas('session.offering.course', function ($q) use ($user) {
                $q->where('department_id', $user->department_id);
            });
        }

        if ($request->filled('offering_id')) {
            $sessionIds = ClassSession::where('course_offering_id', $request->offering_id)->pluck('id');
            $query->whereIn('class_session_id', $sessionIds);
        }

        if ($request->filled('course_id')) {
            $query->whereHas('session.offering', function ($q) use ($request) {
                $q->where('course_id', $request->course_id);
            });
        }

        if ($request->filled('date')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->whereDate('start_time', $request->date);
            });
        }

        if ($request->filled('level')) {
            $level = (int) $request->level;
            $query->where(function ($q) use ($level) {
                $q->whereHas('student', fn($sq) => $sq->where('level', $level))
                  ->orWhereHas('session.offering.course', fn($cq) => $cq->where('level', $level));
            });
        }

        if ($request->filled('semester')) {
            $sem = (int) $request->semester;
            $query->whereHas('session.offering', function ($oq) use ($sem) {
                $oq->where('semester', (string) $sem)
                   ->orWhere('semester', $sem)
                   ->orWhereHas('course', fn($cq) => $cq->where('semester', $sem));
            });
        }

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->whereHas('student', function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('index_number', 'like', "%{$term}%");
            });
        }

        return response()->json(
            $query->limit(500)->get()->map(fn($r) => [
                'id'            => $r->id,
                'student_name'  => $r->student->name ?? '—',
                'index_number'  => $r->student->index_number ?? '—',
                'level'         => $r->student->level ?? ($r->session->offering->course->level ?? 100),
                'semester'      => (int) ($r->session->offering->semester ?? $r->session->offering->course->semester ?? 1),
                'course_code'   => $r->session->offering->course->course_code ?? '—',
                'course_name'   => $r->session->offering->course->course_name ?? '—',
                'session_date'  => $r->session->start_time ?? null,
                'status'        => $r->status,
                'method'        => $r->method,
                'recorded_at'   => $r->created_at,
            ])
        );
    }

    // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────

    private function buildAtRiskCollection()
    {
        $user = auth()->user();
        $atRisk = collect();

        $courseQuery = CourseOffering::with('course');
        if ($user && $user->role === 'HOD') {
            $courseQuery->whereHas('course', function($q) use ($user) {
                $q->where('department_id', $user->department_id);
            });
        }

        foreach ($courseQuery->get() as $offering) {
            $sessionIds    = ClassSession::where('course_offering_id', $offering->id)->where('status', 'ENDED')->pluck('id');
            $totalSessions = $sessionIds->count();
            if ($totalSessions === 0) continue;

            $records = AttendanceRecord::whereIn('class_session_id', $sessionIds)
                ->where('status', 'PRESENT')
                ->selectRaw('student_id, COUNT(*) as present_count')
                ->groupBy('student_id')->get()->keyBy('student_id');

            foreach (Enrollment::where('course_offering_id', $offering->id)->where('status', 'ACTIVE')->with('student:id,name,index_number')->get() as $enrollment) {
                $student      = $enrollment->student;
                if (!$student) continue;
                $presentCount = $records->get($student->id)?->present_count ?? 0;
                $rate         = round($presentCount / $totalSessions * 100, 1);
                if ($rate < 75) {
                    $atRisk->push([
                        'student_id'       => $student->id,
                        'student_name'     => $student->name,
                        'index_number'     => $student->index_number,
                        'course_code'      => $offering->course->course_code,
                        'course_name'      => $offering->course->course_name,
                        'attendance_rate'  => $rate,
                        'sessions_present' => $presentCount,
                        'sessions_total'   => $totalSessions,
                    ]);
                }
            }
        }

        return $atRisk->sortBy('attendance_rate');
    }
}
