<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesSummaryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $period = $request->query('period', 'semua');

        $query = Order::where('status', 'selesai');

        if (in_array($period, ['harian', 'mingguan', 'bulanan'], true)) {
            $now = now();

            match ($period) {
                'harian' => $query->whereDate('created_at', $now->toDateString()),
                'mingguan' => $query->where('created_at', '>=', $now->subDays(7)),
                'bulanan' => $query->whereYear('created_at', $now->year)->whereMonth('created_at', $now->month),
                default => null,
            };
        }

        $orders = $query->with('items')->get();

        $totalRevenue = 0;
        $counts = [];

        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $totalRevenue += $item->price * $item->quantity;
                $name = $item->name;
                if (! isset($counts[$name])) {
                    $counts[$name] = ['quantity' => 0, 'revenue' => 0];
                }
                $counts[$name]['quantity'] += $item->quantity;
                $counts[$name]['revenue'] += $item->price * $item->quantity;
            }
        }

        $items = [];
        foreach ($counts as $name => $value) {
            $items[] = [
                'name' => $name,
                'quantity' => $value['quantity'],
                'revenue' => $value['revenue'],
            ];
        }

        usort($items, fn ($a, $b) => $b['quantity'] <=> $a['quantity']);

        return response()->json([
            'totalRevenue' => $totalRevenue,
            'orderCount' => $orders->count(),
            'topItems' => array_slice($items, 0, 5),
        ]);
    }
}