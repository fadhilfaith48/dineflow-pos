<?php

namespace App\Http\Controllers\Api;

use App\Events\SettingsChanged;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    /**
     * Dispatch broadcast secara aman: bila Reverb mati, penyimpanan tetap sukses.
     */
    private function safeDispatchSettingsChanged(array $payload): void
    {
        try {
            SettingsChanged::dispatch($payload);
        } catch (\Exception $e) {
            Log::warning('Broadcast SettingsChanged gagal: '.$e->getMessage());
        }
    }
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

        $this->safeDispatchSettingsChanged($this->payload());

        return response()->json($this->payload());
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $disk = config('filesystems.photo_disk');
        $path = $request->file('logo')->store('logos', $disk);
        $url = Storage::disk($disk)->url($path);
        Setting::setValue('logo_url', $url);

        $this->safeDispatchSettingsChanged($this->payload());

        return response()->json(['logoUrl' => $url]);
    }

    public function uploadQris(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'qris' => ['required', 'image', 'max:2048'],
        ]);

        $disk = config('filesystems.photo_disk');
        $path = $request->file('qris')->store('qris', $disk);
        $url = Storage::disk($disk)->url($path);
        Setting::setValue('qris_image_url', $url);

        $this->safeDispatchSettingsChanged($this->payload());

        return response()->json(['qrisImageUrl' => $url]);
    }

    /**
     * Payload pengaturan lengkap — dipakai index(), update(), uploadLogo(),
     * uploadQris(), dan broadcast SettingsChanged agar bentuknya konsisten.
     *
     * @return array{taxRate: int, restaurantName: string, restaurantAddress: string, logoUrl: ?string, qrisImageUrl: ?string}
     */
    private function payload(): array
    {
        $settings = Setting::pluck('value', 'key')->toArray();

        return [
            'taxRate' => (int) ($settings['tax_rate'] ?? 10),
            'restaurantName' => $settings['restaurant_name'] ?? 'DINEFLOW RESTAURANT',
            'restaurantAddress' => $settings['restaurant_address'] ?? 'Jl. Raya No. 1, Jakarta',
            'logoUrl' => $settings['logo_url'] ?? null,
            'qrisImageUrl' => $settings['qris_image_url'] ?? null,
        ];
    }
}
