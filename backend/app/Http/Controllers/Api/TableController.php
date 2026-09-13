<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TableResource;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\JsonResponse;

class TableController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TableResource::collection(Table::orderBy('number')->get());
    }

    /**
     * Resolve token QR dari URL /menu/{slug}. Publik, sehingga token itu sendiri
     * adalah "kunci" meja — 404 bila token tidak dikenal.
     */
    public function resolve(string $slug): TableResource
    {
        $table = Table::where('qr_code', $slug)->firstOrFail();

        return new TableResource($table);
    }

    public function store(Request $request): TableResource
    {
        $validated = $request->validate([
            'number' => ['required', 'string', 'max:20', 'unique:tables,number'],
            'seats' => ['required', 'integer', 'min:1'],
            'qrCode' => ['sometimes', 'nullable', 'string', 'max:32'],
        ]);

        $table = Table::create([
            'number' => $validated['number'],
            'seats' => $validated['seats'],
            'status' => 'kosong',
            'qr_code' => $validated['qrCode'] ?? $this->newQrToken(),
        ]);

        return new TableResource($table);
    }

    public function update(Request $request, Table $table): TableResource
    {
        $validated = $request->validate([
            'number' => ['sometimes', 'string', 'max:20', 'unique:tables,number,'.$table->id],
            'seats' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', 'in:kosong,terisi,perlu-dibersihkan'],
            'qrCode' => ['sometimes', 'nullable', 'string'],
        ]);

        $map = [
            'number' => 'number',
            'seats' => 'seats',
            'status' => 'status',
            'qrCode' => 'qr_code',
        ];

        foreach ($map as $inputKey => $column) {
            if (array_key_exists($inputKey, $validated)) {
                $table->{$column} = $validated[$inputKey];
            }
        }

        $table->save();

        return new TableResource($table);
    }

    public function destroy(Table $table): JsonResponse
    {
        $table->delete();

        return response()->json(['message' => 'Meja dihapus']);
    }

    private function newQrToken(): string
    {
        $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
        $out = '';

        for ($i = 0; $i < 8; $i++) {
            $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $out;
    }
}