<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\QRToken;
use App\Models\ClassSession;
use App\Models\DeviceBinding;
use App\Models\AttendanceAttempt;
use App\Models\AttendanceRecord;
use App\Models\Enrollment;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    /**
     * Handle the student check-in process via QR Code.
     */
    public function checkIn(Request $request)
    {
        $request->validate([
            'qr_signature' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric',
            'device_identifier' => 'required|string',
        ]);

        $user = Auth::user(); // The authenticated student

        // 1. Verify QR Token
        $qrToken = QRToken::where('signature', $request->qr_signature)
                          ->where('status', 'ACTIVE')
                          ->first();

        if (!$qrToken) {
            return $this->logFailedAttempt(null, $user, $request, 'INVALID_QR', 'QR token not found or already processed.');
        }

        // 2. Expiration Check
        if (Carbon::now()->isAfter($qrToken->expires_at)) {
            return $this->logFailedAttempt($qrToken->class_session_id, $user, $request, 'EXPIRED_QR', 'The scanned QR code has expired.');
        }

        $session = ClassSession::find($qrToken->class_session_id);
        
        // 3. Active Session Check
        if ($session->status !== 'ACTIVE') {
            return $this->logFailedAttempt($session->id, $user, $request, 'SESSION_INACTIVE', 'The class session is not currently active.');
        }

        // 4. Enrollment Check
        $isEnrolled = Enrollment::where('student_id', $user->id)
            ->where('course_offering_id', $session->course_offering_id)
            ->where('status', 'ACTIVE')
            ->exists();

        if (!$isEnrolled) {
            return $this->logFailedAttempt($session->id, $user, $request, 'NOT_ENROLLED', 'Student is not enrolled in this course.');
        }

        // 5. Duplicate Check
        $existingRecord = AttendanceRecord::where('class_session_id', $session->id)
            ->where('student_id', $user->id)
            ->first();

        if ($existingRecord) {
            return $this->logFailedAttempt($session->id, $user, $request, 'DUPLICATE', 'Attendance already recorded for this session.');
        }

        // 6. Geolocation Check (Haversine Formula)
        $distance = $this->calculateDistance($session->latitude, $session->longitude, $request->latitude, $request->longitude);
        if ($distance > $session->allowed_radius) {
            return $this->logFailedAttempt($session->id, $user, $request, 'OUT_OF_RANGE', "Student is {$distance}m away. Max allowed is {$session->allowed_radius}m.");
        }

        if ($request->accuracy > 100) { // Reject if GPS accuracy is worse than 100 meters
            return $this->logFailedAttempt($session->id, $user, $request, 'LOW_LOCATION_ACCURACY', "Location accuracy too low ({$request->accuracy}m).");
        }

        // 7. Device Binding Check
        $device = DeviceBinding::where('device_identifier', $request->device_identifier)
            ->where('user_id', $user->id)
            ->first();

        if (!$device) {
            return $this->logFailedAttempt($session->id, $user, $request, 'UNREGISTERED_DEVICE', 'This device is not bound to the student account.');
        }
        if ($device->status === 'FLAGGED') {
            return $this->logFailedAttempt($session->id, $user, $request, 'FLAGGED_DEVICE', 'This device has been flagged for suspicious activity.');
        }

        // 8. Success! Log attempt and create record
        $attempt = AttendanceAttempt::create([
            'class_session_id' => $session->id,
            'student_id' => $user->id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'accuracy' => $request->accuracy,
            'distance' => $distance,
            'device_id' => $device->id,
            'result' => 'VERIFIED',
            'reason' => 'All validation checks passed.',
        ]);

        $record = AttendanceRecord::create([
            'class_session_id' => $session->id,
            'student_id' => $user->id,
            'method' => 'VERIFIED',
            'status' => 'PRESENT',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Attendance successfully recorded.',
            'record' => $record,
        ], 201);
    }

    /**
     * Helper to log failed attempts and return a 422 JSON response.
     */
    private function logFailedAttempt($sessionId, $user, $request, $result, $reason)
    {
        $device = DeviceBinding::where('device_identifier', $request->device_identifier)->first();

        $distance = null;
        if ($sessionId) {
            $session = ClassSession::find($sessionId);
            if ($session && $session->latitude && $session->longitude) {
                $distance = $this->calculateDistance($session->latitude, $session->longitude, $request->latitude, $request->longitude);
            }
        }

        AttendanceAttempt::create([
            'class_session_id' => $sessionId,
            'student_id' => $user ? $user->id : null,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'accuracy' => $request->accuracy,
            'distance' => $distance,
            'device_id' => $device ? $device->id : null,
            'result' => $result,
            'reason' => $reason,
        ]);

        return response()->json([
            'status' => 'error',
            'error' => $result,
            'message' => $reason
        ], 422);
    }

    /**
     * Calculate distance between two coordinates in meters using the Haversine formula.
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // Earth's radius in meters

        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($lonDelta / 2) * sin($lonDelta / 2);
             
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }

    /**
     * Public endpoint to get session details by QR signature.
     */
    public function publicSessionDetails($signature)
    {
        $qrToken = QRToken::where('signature', $signature)->where('status', 'ACTIVE')->first();
        if (!$qrToken || Carbon::now()->isAfter($qrToken->expires_at)) {
            return response()->json(['message' => 'QR code is invalid or has expired.'], 404);
        }

        $session = ClassSession::with('offering.course')->find($qrToken->class_session_id);
        if (!$session || $session->status !== 'ACTIVE') {
            return response()->json(['message' => 'Class session is not active.'], 400);
        }

        $students = \App\Models\Student::whereHas('enrollments', function($q) use ($session) {
            $q->where('course_offering_id', $session->course_offering_id)->where('status', 'ACTIVE');
        })->select('id', 'name', 'index_number')->orderBy('name')->get();

        return response()->json([
            'session' => [
                'course_code' => $session->offering->course->course_code,
                'course_name' => $session->offering->course->course_name,
                'latitude' => $session->latitude,
                'longitude' => $session->longitude,
                'allowed_radius' => $session->allowed_radius,
            ],
            'students' => $students
        ]);
    }

    /**
     * Public endpoint for students to mark attendance.
     */
    public function publicCheckIn(Request $request)
    {
        $request->validate([
            'qr_signature' => 'required|string',
            'student_id' => 'required|uuid',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric',
            'device_identifier' => 'required|string',
        ]);

        $student = \App\Models\Student::find($request->student_id);
        if (!$student) return response()->json(['message' => 'Student not found.'], 404);

        $qrToken = QRToken::where('signature', $request->qr_signature)->where('status', 'ACTIVE')->first();
        if (!$qrToken) return $this->logFailedAttemptPublic(null, $student, $request, 'INVALID_QR', 'QR token not found or already processed.');

        if (Carbon::now()->isAfter($qrToken->expires_at)) {
            return $this->logFailedAttemptPublic($qrToken->class_session_id, $student, $request, 'EXPIRED_QR', 'The scanned QR code has expired.');
        }

        $session = ClassSession::find($qrToken->class_session_id);
        if ($session->status !== 'ACTIVE') {
            return $this->logFailedAttemptPublic($session->id, $student, $request, 'SESSION_INACTIVE', 'The class session is not currently active.');
        }

        $isEnrolled = Enrollment::where('student_id', $student->id)
            ->where('course_offering_id', $session->course_offering_id)
            ->where('status', 'ACTIVE')->exists();
        if (!$isEnrolled) return $this->logFailedAttemptPublic($session->id, $student, $request, 'NOT_ENROLLED', 'Student is not enrolled in this course.');

        $existingRecord = AttendanceRecord::where('class_session_id', $session->id)->where('student_id', $student->id)->first();
        if ($existingRecord) return $this->logFailedAttemptPublic($session->id, $student, $request, 'DUPLICATE', 'Attendance already recorded for this session.');

        // Device logic: a single device_identifier can only be used by one student per course_offering_id
        $deviceUsedByAnother = AttendanceRecord::whereHas('session', function($q) use ($session) {
            $q->where('course_offering_id', $session->course_offering_id);
        })
        ->where('device_identifier', $request->device_identifier)
        ->where('student_id', '!=', $student->id)
        ->first();

        if ($deviceUsedByAnother) {
            return $this->logFailedAttemptPublic($session->id, $student, $request, 'DEVICE_CONFLICT', 'This device has already been used by another student in this course.');
        }

        // Geolocation Check
        $distance = $this->calculateDistance($session->latitude, $session->longitude, $request->latitude, $request->longitude);
        if ($distance > $session->allowed_radius) {
            return $this->logFailedAttemptPublic($session->id, $student, $request, 'OUT_OF_RANGE', "You are {$distance}m away. Max allowed is {$session->allowed_radius}m.");
        }

        if ($request->accuracy > 100) {
            return $this->logFailedAttemptPublic($session->id, $student, $request, 'LOW_LOCATION_ACCURACY', "Location accuracy too low ({$request->accuracy}m).");
        }

        // Success!
        AttendanceAttempt::create([
            'class_session_id' => $session->id,
            'student_id' => $student->id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'device_identifier' => $request->device_identifier,
            'result' => 'SUCCESS',
            'failure_reason' => null
        ]);

        $record = AttendanceRecord::create([
            'class_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'PRESENT',
            'method' => 'QR_SCAN',
            'device_identifier' => $request->device_identifier,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Attendance recorded successfully!',
            'record' => $record
        ], 201);
    }

    private function logFailedAttemptPublic($sessionId, $student, Request $request, $result, $reason)
    {
        if ($sessionId) {
            AttendanceAttempt::create([
                'class_session_id' => $sessionId,
                'student_id' => $student->id,
                'latitude' => $request->latitude ?? null,
                'longitude' => $request->longitude ?? null,
                'device_identifier' => $request->device_identifier ?? 'UNKNOWN',
                'result' => $result,
                'failure_reason' => $reason
            ]);
        }

        return response()->json([
            'status' => 'error',
            'error' => $result,
            'message' => $reason
        ], 422);
    }
}
