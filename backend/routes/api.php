<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\ResultsController;
use App\Http\Controllers\Api\AdminController;

Route::post('/login', [AuthController::class, 'login']);

// Public QR Code Scan Endpoints
Route::get('/public/session/{signature}', [AttendanceController::class, 'publicSessionDetails']);
Route::post('/public/check-in', [AttendanceController::class, 'publicCheckIn']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Attendance Core Engine
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);

    // Fetch Lecturer Courses
    Route::get('/courses', function (Request $request) {
        return \App\Models\CourseOffering::whereHas('course')->with('course')->where('lecturer_id', $request->user()->id)->get();
    });

    // Lecturer Session Management
    Route::get('/sessions/history', [SessionController::class, 'history']);
    Route::get('/sessions/records', [SessionController::class, 'records']);
    Route::get('/sessions/{id}/attendance', [SessionController::class, 'sessionAttendance']);
    Route::post('/sessions/start', [SessionController::class, 'start']);
    Route::post('/sessions/{session}/rotate-qr', [SessionController::class, 'rotateQR']);
    Route::post('/sessions/{session}/end', [SessionController::class, 'end']);

    // Results & Analytics
    Route::post('/offerings/{offering}/results/upload', [ResultsController::class, 'upload']);
    Route::get('/offerings/{offering}/results/analytics', [ResultsController::class, 'analytics']);
    Route::get('/offerings/{offering}/attendance/semester', [SessionController::class, 'exportSemesterAttendance']);

    // ── Admin / HOD Routes (SUPER_ADMIN only) ────────────────────────────────
    Route::middleware('super_admin')->prefix('admin')->group(function () {

        // Overview
        Route::get('/stats',                          [AdminController::class, 'stats']);
        Route::get('/students/at-risk',               [AdminController::class, 'atRiskStudents']);

        // Sessions (live MUST come before /sessions/history to avoid wildcard clash)
        Route::get('/sessions/live',                  [AdminController::class, 'liveSessions']);
        Route::get('/sessions/history',               [AdminController::class, 'listSessions']);

        // Students
        Route::get('/students',                       [AdminController::class, 'listStudents']);
        Route::post('/students/upload',               [AdminController::class, 'uploadStudents']);

        // Users
        Route::get('/users',                          [AdminController::class, 'listUsers']);
        Route::post('/users',                         [AdminController::class, 'createUser']);
        Route::patch('/users/{id}',                   [AdminController::class, 'updateUser']);
        Route::patch('/users/{id}/toggle-status',     [AdminController::class, 'toggleUserStatus']);

        // Departments
        Route::get('/departments',                    [AdminController::class, 'listDepartments']);
        Route::post('/departments',                   [AdminController::class, 'createDepartment']);
        Route::patch('/departments/{id}',             [AdminController::class, 'updateDepartment']);

        // Courses
        Route::get('/courses',                        [AdminController::class, 'listCourses']);
        Route::post('/courses',                       [AdminController::class, 'createCourse']);
        Route::patch('/courses/{id}',                 [AdminController::class, 'updateCourse']);
        Route::delete('/courses/{id}',                [AdminController::class, 'deleteCourse']);

        // Offerings
        Route::get('/offerings',                      [AdminController::class, 'listOfferings']);
        Route::post('/offerings',                     [AdminController::class, 'createOffering']);
        Route::delete('/offerings/{id}',              [AdminController::class, 'deleteOffering']);

        // Attendance Records
        Route::get('/attendance',                     [AdminController::class, 'listAttendance']);
    });

});
