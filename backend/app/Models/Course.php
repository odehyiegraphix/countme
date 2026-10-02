<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Course extends Model
{
    use HasUuids, SoftDeletes;
    protected $fillable = ['department_id', 'course_code', 'course_name', 'credit_hours', 'level', 'semester'];
    public function department(): BelongsTo { return $this->belongsTo(Department::class); }
    public function offerings(): HasMany { return $this->hasMany(CourseOffering::class); }
}