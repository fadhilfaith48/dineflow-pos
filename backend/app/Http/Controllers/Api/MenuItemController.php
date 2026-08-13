<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MenuItemResource;
use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\JsonResponse;

class MenuItemController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = MenuItem::query();

        if ($request->filled('categoryId')) {
            $query->where('category_id', $request->integer('categoryId'));
        }

        return MenuItemResource::collection($query->orderBy('id')->get());
    }

    public function store(Request $request): MenuItemResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'categoryId' => ['required', 'exists:menu_categories,id'],
            'description' => ['nullable', 'string'],
            'imageUrl' => ['nullable', 'string'],
        ]);

        $last = MenuItem::query()->orderByDesc('id')->value('id') ?? 0;

        $item = MenuItem::create([
            'code' => '#M'.str_pad((string) ($last + 1), 2, '0', STR_PAD_LEFT),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'category_id' => $validated['categoryId'],
            'available' => true,
            'image_url' => $validated['imageUrl'] ?? null,
        ]);

        return new MenuItemResource($item);
    }

    public function update(Request $request, MenuItem $menuItem): MenuItemResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'price' => ['sometimes', 'integer', 'min:0'],
            'categoryId' => ['sometimes', 'exists:menu_categories,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'available' => ['sometimes', 'boolean'],
            'imageUrl' => ['sometimes', 'nullable', 'string'],
        ]);

        $map = [
            'name' => 'name',
            'price' => 'price',
            'categoryId' => 'category_id',
            'description' => 'description',
            'available' => 'available',
            'imageUrl' => 'image_url',
        ];

        foreach ($map as $inputKey => $column) {
            if (array_key_exists($inputKey, $validated)) {
                $menuItem->{$column} = $validated[$inputKey];
            }
        }

        $menuItem->save();

        return new MenuItemResource($menuItem);
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        $menuItem->delete();

        return response()->json(['message' => 'Menu dihapus']);
    }
}