<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enrollment extends Model
{
    use HasUuids;
    protected $fillable = ['student_id', 'course_offering_id', 'status'];
    public function student(): BelongsTo { return $this->belongsTo(Student::class, 'student_id'); }
    public function courseOffering(): BelongsTo { return $this->belongsTo(CourseOffering::class, 'course_offering_id'); }
}