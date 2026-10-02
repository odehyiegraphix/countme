<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentResult;
use App\Models\AttendanceRecord;
use App\Models\ClassSession;
use App\Models\CourseOffering;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ResultsController extends Controller
{
    public function upload(Request $request, CourseOffering $offering)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:2048']);

        $file      = $request->file('file');
        $handle    = fopen($file->getPathname(), 'r');
        $batchId   = Str::uuid()->toString();

        $sessionIds    = ClassSession::where('course_offering_id', $offering->id)->pluck('id');
        $totalSessions = $sessionIds->count();
        $attendanceMap = [];

        if ($totalSessions > 0) {
            $records = AttendanceRecord::whereIn('class_session_id', $sessionIds)
                ->where('status', 'PRESENT')
                ->selectRaw('student_id, COUNT(*) as present_count')
                ->groupBy('student_id')->get()->keyBy('student_id');
            foreach ($records as $uid => $rec) {
                $attendanceMap[$uid] = round($rec->present_count / $totalSessions * 100, 2);
            }
        }

        $header = null; $rows = []; $errors = []; $line_no = 0;

        while (($line = fgetcsv($handle)) !== false) {
            $line_no++;
            if ($line_no === 1) {
                $header = array_map(fn($h) => strtolower(trim(str_replace([' ','-'],'_',$h))), $line);
                continue;
            }
            if (!$header || count($line) < count($header)) { $errors[] = "Row $line_no: column count mismatch."; continue; }

            $row   = array_combine($header, $line);
            $sid   = trim($row['student_id'] ?? $row['index_number'] ?? $row['index_no'] ?? '');
            $name  = trim($row['student_name'] ?? $row['name'] ?? '');
            $score = floatval($row['score'] ?? -1);

            if (!$sid || !$name) { $errors[] = "Row $line_no: missing student_id or student_name."; continue; }
            if ($score < 0 || $score > 100) { $errors[] = "Row $line_no: score must be 0-100."; continue; }

            $attendanceRate = null;
            $student = \App\Models\Student::where('index_number', $sid)
                ->orWhere('id', $sid)
                ->first();
            if (!$student && $name) {
                $student = \App\Models\Student::where('name', 'like', "%{$name}%")->first();
            }

            if ($totalSessions > 0) {
                if ($student && isset($attendanceMap[$student->id])) {
                    $attendanceRate = $attendanceMap[$student->id];
                } else {
                    $attendanceRate = 0.0;
                }
            }

            $rows[] = [
                'course_offering_id' => $offering->id,
                'uploaded_by'        => $request->user()->id,
                'student_id'         => $sid,
                'student_name'       => $name,
                'score'              => $score,
                'grade'              => StudentResult::computeGrade($score),
                'attendance_rate'    => $attendanceRate,
                'upload_batch'       => $batchId,
                'created_at'         => now(),
                'updated_at'         => now(),
            ];
        }
        fclose($handle);

        if (empty($rows)) {
            return response()->json(['message' => 'No valid rows found.', 'errors' => $errors], 422);
        }

        StudentResult::where('course_offering_id', $offering->id)->delete();
        StudentResult::insert($rows);

        return response()->json([
            'message'       => count($rows).' student results uploaded successfully.',
            'batch_id'      => $batchId,
            'rows_imported' => count($rows),
            'errors'        => $errors,
        ]);
    }

    public function analytics(CourseOffering $offering)
    {
        $results = StudentResult::where('course_offering_id', $offering->id)->get();
        if ($results->isEmpty()) {
            return response()->json(['message' => 'No results uploaded yet.', 'data' => null], 404);
        }

        // Dynamically compute real-time attendance link in case sessions happened or updated
        $sessionIds = ClassSession::where('course_offering_id', $offering->id)->pluck('id');
        $totalSessions = $sessionIds->count();
        if ($totalSessions > 0) {
            $records = AttendanceRecord::whereIn('class_session_id', $sessionIds)
                ->where('status', 'PRESENT')
                ->selectRaw('student_id, COUNT(*) as present_count')
                ->groupBy('student_id')->get()->keyBy('student_id');

            foreach ($results as $res) {
                $student = \App\Models\Student::where('index_number', $res->student_id)
                    ->orWhere('id', $res->student_id)
                    ->first();
                if (!$student && $res->student_name) {
                    $student = \App\Models\Student::where('name', 'like', "%{$res->student_name}%")->first();
                }

                $presentCount = $student ? ($records->get($student->id)?->present_count ?? 0) : 0;
                $computedRate = round(($presentCount / $totalSessions) * 100, 1);
                if ($res->attendance_rate !== $computedRate) {
                    $res->attendance_rate = $computedRate;
                    $res->save();
                }
            }
            $results = StudentResult::where('course_offering_id', $offering->id)->get();
        }

        $gradeDistribution = $results->groupBy('grade')->map->count();
        $avgScore          = round($results->avg('score'), 2);
        $passRate          = round($results->where('score', '>=', 50)->count() / $results->count() * 100, 2);
        $withAttendance    = $results->whereNotNull('attendance_rate');
        $avgAttendance     = $withAttendance->count() > 0 ? round($withAttendance->avg('attendance_rate'), 2) : null;
        $atRisk            = $withAttendance->filter(fn($r) => $r->attendance_rate < 75)->count();

        // Grade vs Average Attendance Comparison
        $gradeAttendanceComparison = [];
        foreach (['A', 'B', 'C', 'D', 'F'] as $g) {
            $matching = $results->where('grade', $g);
            $withAtt = $matching->whereNotNull('attendance_rate');
            $gradeAttendanceComparison[] = [
                'grade'          => $g,
                'count'          => $matching->count(),
                'avg_attendance' => $withAtt->count() > 0 ? round($withAtt->avg('attendance_rate'), 1) : 0,
                'avg_score'      => $matching->count() > 0 ? round($matching->avg('score'), 1) : 0,
            ];
        }

        // Attendance-Performance Quadrants
        $quadrants = [
            'high_att_high_score' => $withAttendance->filter(fn($r) => $r->attendance_rate >= 75 && $r->score >= 60)->count(),
            'high_att_low_score'  => $withAttendance->filter(fn($r) => $r->attendance_rate >= 75 && $r->score < 60)->count(),
            'low_att_high_score'  => $withAttendance->filter(fn($r) => $r->attendance_rate < 75 && $r->score >= 60)->count(),
            'low_att_low_score'   => $withAttendance->filter(fn($r) => $r->attendance_rate < 75 && $r->score < 60)->count(),
        ];

        $correlation = $rSquared = $slope = $intercept = $strength = $direction = $insight = null;
        $regressionLine = [];

        if ($withAttendance->count() >= 3) {
            $xs = $withAttendance->pluck('attendance_rate')->map(fn($v) => (float)$v)->toArray();
            $ys = $withAttendance->pluck('score')->map(fn($v) => (float)$v)->toArray();
            [$r, $m, $b] = $this->pearsonWithRegression($xs, $ys);

            $correlation = round($r, 4);
            $rSquared    = round($r * $r, 4);
            $slope       = round($m, 4);
            $intercept   = round($b, 4);
            $absR        = abs($r);

            $strength  = $absR >= 0.70 ? 'Strong' : ($absR >= 0.40 ? 'Moderate' : ($absR >= 0.20 ? 'Weak' : 'Negligible'));
            $direction = $r >= 0 ? 'positive' : 'negative';
            $pct       = round($rSquared * 100, 1);

            $insight = match(true) {
                $absR >= 0.70 && $r > 0 => "Strong positive correlation (r = {$correlation}). Students who attend more classes consistently score higher. Attendance explains {$pct}% of score variance.",
                $absR >= 0.70 && $r < 0 => "Strong negative correlation (r = {$correlation}). Higher attendance is associated with lower scores — this warrants investigation.",
                $absR >= 0.40 && $r > 0 => "Moderate positive correlation (r = {$correlation}). Meaningful link between attendance and performance, explaining {$pct}% of score variance.",
                $absR >= 0.40 && $r < 0 => "Moderate negative correlation (r = {$correlation}). A counterintuitive relationship exists — consider confounding factors.",
                $absR >= 0.20            => "Weak correlation (r = {$correlation}). Attendance has a small but present relationship with exam scores.",
                default                  => "Negligible correlation (r = {$correlation}). No strong linear relationship found for this cohort.",
            };

            $regressionLine = [
                ['attendance' => 0,   'score' => round(max(0, $b), 2)],
                ['attendance' => 100, 'score' => round(min(100, $m * 100 + $b), 2)],
            ];
        }

        $scatterData = $withAttendance->map(fn($r) => [
            'name'       => $r->student_name,
            'studentId'  => $r->student_id,
            'attendance' => (float) $r->attendance_rate,
            'score'      => (float) $r->score,
            'grade'      => $r->grade,
        ])->values();

        return response()->json([
            'summary' => [
                'total_students' => $results->count(),
                'avg_score'      => $avgScore,
                'avg_attendance' => $avgAttendance,
                'pass_rate'      => $passRate,
                'at_risk'        => $atRisk,
            ],
            'correlation' => [
                'r'              => $correlation,
                'r_squared'      => $rSquared,
                'slope'          => $slope,
                'intercept'      => $intercept,
                'strength'       => $strength,
                'direction'      => $direction,
                'insight'        => $insight,
                'sample_size'    => $withAttendance->count(),
                'regression_line'=> $regressionLine,
            ],
            'grade_distribution'            => $gradeDistribution,
            'grade_attendance_comparison'   => $gradeAttendanceComparison,
            'quadrants'                     => $quadrants,
            'scatter_data'                  => $scatterData,
            'all_results'                   => $results,
        ]);
    }

    private function pearsonWithRegression(array $xs, array $ys): array
    {
        $n = count($xs);
        $meanX = array_sum($xs) / $n;
        $meanY = array_sum($ys) / $n;
        $cov = $varX = $varY = 0.0;

        for ($i = 0; $i < $n; $i++) {
            $dx = $xs[$i] - $meanX; $dy = $ys[$i] - $meanY;
            $cov += $dx * $dy; $varX += $dx * $dx; $varY += $dy * $dy;
        }

        if ($varX == 0 || $varY == 0) return [0, 0, $meanY];
        $r = $cov / sqrt($varX * $varY);
        $m = $cov / $varX;
        $b = $meanY - $m * $meanX;
        return [$r, $m, $b];
    }
}
