<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return UserResource::collection(User::orderBy('id')->get());
    }

    public function store(Request $request): UserResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'role' => ['required', 'in:kasir,pelayan,dapur,admin'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'role' => $validated['role'],
            'password' => Hash::make(config('dinflow.default_password')),
        ]);

        return new UserResource($user);
    }

    public function update(Request $request, User $user): UserResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'username' => ['sometimes', 'string', 'max:255', 'unique:users,username,'.$user->id],
            'role' => ['sometimes', 'in:kasir,pelayan,dapur,admin'],
        ]);

        $user->fill($validated);
        $user->save();

        return new UserResource($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            throw ValidationException::withMessages([
                'user' => ['Tidak bisa menghapus akun yang sedang login'],
            ]);
        }

        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            throw ValidationException::withMessages([
                'user' => ['Minimal harus tersisa satu admin'],
            ]);
        }

        $user->delete();

        return response()->json(['message' => 'Staf dihapus']);
    }

    public function resetPassword(User $user): JsonResponse
    {
        $user->password = Hash::make(config('dinflow.default_password'));
        $user->save();

        return response()->json(['message' => 'Password staf berhasil direset ke 1234']);
    }
}