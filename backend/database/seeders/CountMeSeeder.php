<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\User;

class CountMeSeeder extends Seeder
{
    public function run()
    {
        // 1. Create global Super Admin user
        User::firstOrCreate(
            ['email' => 'admin@countme.edu'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('password123'),
                'role' => 'SUPER_ADMIN',
                'status' => 'ACTIVE',
            ]
        );

        // 3. Create a Department (Moved up to assign to HOD)
        $deptId = (string) Str::uuid();
        DB::table('departments')->insertOrIgnore([
            'id' => $deptId,
            'name' => 'Computer Science',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create HOD user
        User::firstOrCreate(
            ['email' => 'hod@countme.edu'],
            [
                'name' => 'Head of Department',
                'password' => Hash::make('password123'),
                'role' => 'HOD',
                'department_id' => $deptId,
                'status' => 'ACTIVE',
            ]
        );

        // 2b. Create a Lecturer user
        $lecturer = User::firstOrCreate(
            ['email' => 'lecturer@countme.edu'],
            [
                'name' => 'Alan Smith',
                'password' => Hash::make('password123'),
                'role' => 'LECTURER',
                'department_id' => $deptId,
                'status' => 'ACTIVE',
            ]
        );



        // 4. Create a Course
        $courseId = (string) Str::uuid();
        DB::table('courses')->insertOrIgnore([
            'id' => $courseId,
            'department_id' => $deptId,
            'course_code' => 'CS101',
            'course_name' => 'Introduction to Programming',
            'credit_hours' => 3,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 5. Create a Course Offering assigned to the lecturer
        $offeringId = (string) Str::uuid();
        DB::table('course_offerings')->insertOrIgnore([
            'id' => $offeringId,
            'course_id' => $courseId,
            'lecturer_id' => $lecturer->id,
            'semester' => 'Fall',
            'academic_year' => '2026/2027',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->command->info('Seeded hod@countme.edu (SUPER_ADMIN) and lecturer@countme.edu (LECTURER).');
    }
}
