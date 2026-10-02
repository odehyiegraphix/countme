<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireSuperAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!in_array($request->user()?->role, ['SUPER_ADMIN', 'HOD'])) {
            return response()->json(['message' => 'Unauthorized. Super Admin or HOD access required.'], 403);
        }

        return $next($request);
    }
}
