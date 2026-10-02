<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentResult extends Model
{
    protected $fillable = [
        'course_offering_id',
        'uploaded_by',
        'student_id',
        'student_name',
        'score',
        'grade',
        'attendance_rate',
        'upload_batch',
    ];

    protected $casts = [
        'score'           => 'float',
        'attendance_rate' => 'float',
    ];

    public function courseOffering()
    {
        return $this->belongsTo(CourseOffering::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Derive a letter grade from a numeric score.
     */
    public static function computeGrade(float $score): string
    {
        return match(true) {
            $score >= 70 => 'A',
            $score >= 60 => 'B',
            $score >= 50 => 'C',
            $score >= 45 => 'D',
            default      => 'F',
        };
    }
}
