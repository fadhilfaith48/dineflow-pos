<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Izinkan hanya role tertentu (kasir/pelayan/dapur/admin).
     * Dipakai lewat alias `role:kasir,admin`.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            abort(403, 'Akses ditolak');
        }

        return $next($request);
    }
}
