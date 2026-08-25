<?php

namespace App\Http\Controllers\Api;

use App\Events\SettingsChanged;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json($this->payload());
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'taxRate' => ['nullable', 'integer', 'min:0', 'max:100'],
            'restaurantName' => ['nullable', 'string', 'max:255'],
            'restaurantAddress' => ['nullable', 'string', 'max:255'],
        ]);

        if (isset($validated['taxRate'])) {
            Setting::setValue('tax_rate', (string) $validated['taxRate']);
        }
        if (isset($validated['restaurantName'])) {
            Setting::setValue('restaurant_name', $validated['restaurantName']);
        }
        if (isset($validated['restaurantAddress'])) {
            Setting::setValue('restaurant_address', $validated['restaurantAddress']);
        }

        SettingsChanged::dispatch($this->payload());

        return response()->json($this->payload());
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $path = $request->file('logo')->store('logos', 'public');
        $url = Storage::disk('public')->url($path);
        Setting::setValue('logo_url', $url);

        SettingsChanged::dispatch($this->payload());

        return response()->json(['logoUrl' => $url]);
    }

    /**
     * Payload pengaturan lengkap — dipakai index(), update(), uploadLogo(),
     * dan broadcast SettingsChanged agar bentuknya konsisten.
     *
     * @return array{taxRate: int, restaurantName: string, restaurantAddress: string, logoUrl: ?string}
     */
    private function payload(): array
    {
        $settings = Setting::pluck('value', 'key')->toArray();

        return [
            'taxRate' => (int) ($settings['tax_rate'] ?? 10),
            'restaurantName' => $settings['restaurant_name'] ?? 'DINEFLOW RESTAURANT',
            'restaurantAddress' => $settings['restaurant_address'] ?? 'Jl. Raya No. 1, Jakarta',
            'logoUrl' => $settings['logo_url'] ?? null,
        ];
    }
}
