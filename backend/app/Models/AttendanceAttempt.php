<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceAttempt extends Model
{
    use HasUuids;
    protected $fillable = ['class_session_id', 'student_id', 'latitude', 'longitude', 'accuracy', 'distance', 'device_id', 'result', 'reason'];
    public function session(): BelongsTo { return $this->belongsTo(ClassSession::class, 'class_session_id'); }
    public function student(): BelongsTo { return $this->belongsTo(User::class, 'student_id'); }
    public function device(): BelongsTo { return $this->belongsTo(DeviceBinding::class, 'device_id'); }
}