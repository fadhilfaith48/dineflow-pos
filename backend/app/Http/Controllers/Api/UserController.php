<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

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
            'password' => Hash::make('1234'),
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

        $map = [
            'name' => 'name',
            'username' => 'username',
            'role' => 'role',
        ];

        foreach ($map as $inputKey => $column) {
            if (array_key_exists($inputKey, $validated)) {
                $user->{$column} = $validated[$inputKey];
            }
        }

        $user->save();

        return new UserResource($user);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'Staf dihapus']);
    }

    public function resetPassword(User $user): JsonResponse
    {
        $user->password = Hash::make('1234');
        $user->save();

        return response()->json(['message' => 'Password staf berhasil direset ke 1234']);
    }
}