<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassSession extends Model
{
    use HasUuids;
    protected $fillable = ['course_offering_id', 'lecturer_id', 'latitude', 'longitude', 'allowed_radius', 'start_time', 'end_time', 'status'];
    protected $casts = ['start_time' => 'datetime', 'end_time' => 'datetime'];
    public function offering(): BelongsTo { return $this->belongsTo(CourseOffering::class, 'course_offering_id'); }
    public function lecturer(): BelongsTo { return $this->belongsTo(User::class, 'lecturer_id'); }
    public function qrTokens(): HasMany { return $this->hasMany(QRToken::class); }
    public function attendanceAttempts(): HasMany { return $this->hasMany(AttendanceAttempt::class); }
    public function attendanceRecords(): HasMany { return $this->hasMany(AttendanceRecord::class); }
}