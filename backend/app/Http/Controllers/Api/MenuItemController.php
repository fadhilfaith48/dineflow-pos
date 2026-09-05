<?php

namespace App\Http\Controllers\Api;

use App\Events\MenuChanged;
use App\Http\Controllers\Controller;
use App\Http\Resources\MenuItemResource;
use App\Models\MenuItem;
use App\Models\MenuItemVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MenuItemController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = MenuItem::with('variants');

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
            'image' => ['nullable', 'image', 'max:2048'],
            'isSpicy' => ['nullable', 'boolean'],
            'variants' => ['nullable', 'array'],
            'variants.*.name' => ['required_with:variants', 'string', 'max:255'],
            'variants.*.price' => ['required_with:variants', 'integer', 'min:0'],
            'variants.*.available' => ['nullable', 'boolean'],
            'variants.*.imageUrl' => ['nullable', 'string'],
            'variants.*.image' => ['nullable', 'image', 'max:2048'],
        ]);

        $last = DB::transaction(function () {
            return MenuItem::lockForUpdate()->orderByDesc('id')->value('id') ?? 0;
        });

        $item = MenuItem::create([
            'code' => '#M'.str_pad((string) ($last + 1), 2, '0', STR_PAD_LEFT),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'category_id' => $validated['categoryId'],
            'available' => true,
            'is_spicy' => $validated['isSpicy'] ?? false,
            'image_url' => $this->resolveImageUrl($request) ?? $validated['imageUrl'] ?? null,
        ]);

        if (! empty($validated['variants'])) {
            foreach ($validated['variants'] as $i => $v) {
                $item->variants()->create([
                    'name' => $v['name'],
                    'price' => $v['price'],
                    'available' => $v['available'] ?? true,
                    'image_url' => $this->resolveVariantImageUrl($request, $i) ?? $v['imageUrl'] ?? null,
                    'order' => $i,
                ]);
            }
        }

        MenuChanged::dispatch($item);

        return new MenuItemResource($item->load('variants'));
    }

    public function update(Request $request, MenuItem $menuItem): MenuItemResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'price' => ['sometimes', 'integer', 'min:0'],
            'categoryId' => ['sometimes', 'exists:menu_categories,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'available' => ['sometimes', 'boolean'],
            'isSpicy' => ['sometimes', 'boolean'],
            'imageUrl' => ['sometimes', 'nullable', 'string'],
            'image' => ['nullable', 'image', 'max:2048'],
            'variants' => ['nullable', 'array'],
            'variants.*.name' => ['required_with:variants', 'string', 'max:255'],
            'variants.*.price' => ['required_with:variants', 'integer', 'min:0'],
            'variants.*.available' => ['nullable', 'boolean'],
            'variants.*.imageUrl' => ['nullable', 'string'],
            'variants.*.image' => ['nullable', 'image', 'max:2048'],
        ]);

        $map = [
            'name' => 'name',
            'price' => 'price',
            'categoryId' => 'category_id',
            'description' => 'description',
            'available' => 'available',
            'isSpicy' => 'is_spicy',
        ];

        foreach ($map as $inputKey => $column) {
            if (array_key_exists($inputKey, $validated)) {
                $menuItem->{$column} = $validated[$inputKey];
            }
        }

        $uploaded = $this->resolveImageUrl($request);
        if ($uploaded !== null) {
            $menuItem->image_url = $uploaded;
        } elseif (array_key_exists('imageUrl', $validated)) {
            $menuItem->image_url = $validated['imageUrl'];
        }

        $menuItem->save();

        if (array_key_exists('variants', $validated)) {
            $menuItem->variants()->delete();
            foreach ($validated['variants'] as $i => $v) {
                $menuItem->variants()->create([
                    'name' => $v['name'],
                    'price' => $v['price'],
                    'available' => $v['available'] ?? true,
                    'image_url' => $this->resolveVariantImageUrl($request, $i) ?? $v['imageUrl'] ?? null,
                    'order' => $i,
                ]);
            }
        }

        MenuChanged::dispatch($menuItem);

        return new MenuItemResource($menuItem->load('variants'));
    }

    private function resolveImageUrl(Request $request): ?string
    {
        if (! $request->hasFile('image')) {
            return null;
        }

        $disk = config('filesystems.photo_disk');
        $path = $request->file('image')->store('menu-items', $disk);

        return Storage::disk($disk)->url($path);
    }

    private function resolveVariantImageUrl(Request $request, int $index): ?string
    {
        if (! $request->hasFile("variants.$index.image")) {
            return null;
        }

        $disk = config('filesystems.photo_disk');
        $path = $request->file("variants.$index.image")->store('menu-items/variants', $disk);

        return Storage::disk($disk)->url($path);
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        $menuItem->delete();

        MenuChanged::dispatch($menuItem);

        return response()->json(['message' => 'Menu dihapus']);
    }
}