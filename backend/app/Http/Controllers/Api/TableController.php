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

    public function store(Request $request): TableResource
    {
        $validated = $request->validate([
            'number' => ['required', 'string', 'max:20', 'unique:tables,number'],
            'seats' => ['required', 'integer', 'min:1'],
        ]);

        $table = Table::create([
            'number' => $validated['number'],
            'seats' => $validated['seats'],
            'status' => 'kosong',
            'qr_code' => $validated['number'],
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
}