<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QRToken extends Model
{
    use HasUuids;
    protected $fillable = ['class_session_id', 'signature', 'issued_at', 'expires_at', 'status'];
    protected $casts = ['issued_at' => 'datetime', 'expires_at' => 'datetime'];
    public function session(): BelongsTo { return $this->belongsTo(ClassSession::class, 'class_session_id'); }
}