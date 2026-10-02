<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use HasUuids, SoftDeletes;
    protected $fillable = ['name', 'hod_id'];
    public function hod(): BelongsTo { return $this->belongsTo(User::class, 'hod_id'); }
    public function courses(): HasMany { return $this->hasMany(Course::class); }
}