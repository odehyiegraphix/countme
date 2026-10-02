<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids;

    protected $fillable = ['name', 'email', 'password', 'role', 'status', 'department_id'];
    protected $hidden = ['password', 'remember_token'];
    protected function casts(): array { return ['email_verified_at' => 'datetime', 'password' => 'hashed']; }

    public function department(): BelongsTo { return $this->belongsTo(Department::class); }
    public function deviceBindings(): HasMany { return $this->hasMany(DeviceBinding::class); }
    public function enrollments(): HasMany { return $this->hasMany(Enrollment::class, 'student_id'); }
    public function taughtOfferings(): HasMany { return $this->hasMany(CourseOffering::class, 'lecturer_id'); }
    public function attendanceRecords(): HasMany { return $this->hasMany(AttendanceRecord::class, 'student_id'); }
    public function attendanceAttempts(): HasMany { return $this->hasMany(AttendanceAttempt::class, 'student_id'); }
}