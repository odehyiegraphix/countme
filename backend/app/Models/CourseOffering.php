<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CourseOffering extends Model
{
    use HasUuids, SoftDeletes;
    protected $fillable = ['course_id', 'lecturer_id', 'semester', 'academic_year'];
    public function course(): BelongsTo { return $this->belongsTo(Course::class); }
    public function lecturer(): BelongsTo { return $this->belongsTo(User::class, 'lecturer_id'); }
    public function enrollments(): HasMany { return $this->hasMany(Enrollment::class); }
    public function classSessions(): HasMany { return $this->hasMany(ClassSession::class); }
}