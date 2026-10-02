<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceBinding extends Model
{
    use HasUuids;
    protected $fillable = ['user_id', 'device_identifier', 'registered_at', 'status'];
    protected $casts = ['registered_at' => 'datetime'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}