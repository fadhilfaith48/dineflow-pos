<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SalesSummaryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::where('status', 'selesai');
        $this->applyFilters($request, $query);

        $orders = $query->with(['items', 'payment'])->get();

        $totalRevenue = 0;
        $counts = [];

        $breakdown = [
            'tunai' => ['revenue' => 0, 'count' => 0],
            'qris' => ['revenue' => 0, 'count' => 0],
        ];

        foreach ($orders as $order) {
            if ($order->payment && isset($breakdown[$order->payment->method])) {
                $breakdown[$order->payment->method]['revenue'] += $order->total;
                $breakdown[$order->payment->method]['count']++;
            }

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
            'paymentBreakdown' => $breakdown,
        ]);
    }

    public function export(Request $request): Response
    {
        $query = Order::where('status', 'selesai')->with(['items', 'payment', 'table']);
        $this->applyFilters($request, $query);

        $orders = $query->orderByDesc('created_at')->get();

        $header = ['Tanggal', 'No. Order', 'Meja', 'Item', 'Qty', 'Harga', 'Subtotal', 'Pajak', 'Total', 'Metode Bayar', 'Kasir'];

        $rows = [];
        foreach ($orders as $order) {
            $itemNames = collect($order->items)->map(fn ($item) => $item->name)->implode('; ');
            $itemQty = $order->items->sum('quantity');
            $subtotal = $order->items->sum(fn ($item) => $item->price * $item->quantity);
            $tax = $order->total - $subtotal;

            $rows[] = [
                $order->created_at->format('Y-m-d H:i'),
                $order->order_number,
                $order->table->number ?? '-',
                $itemNames,
                $itemQty,
                $subtotal,
                $subtotal,
                $tax,
                $order->total,
                $order->payment->method ?? '-',
                $order->payment->paid_by ?? '-',
            ];
        }

        $callback = function () use ($header, $rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $header);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        };

        $filename = 'laporan-penjualan-' . now()->format('Y-m-d') . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Filter bersama untuk index() & export(): periode preset + rentang tanggal custom.
     */
    private function applyFilters(Request $request, Builder $query): void
    {
        $period = $request->query('period', 'semua');

        if (in_array($period, ['harian', 'mingguan', 'bulanan'], true)) {
            $now = now();

            match ($period) {
                'harian' => $query->whereDate('created_at', $now->toDateString()),
                'mingguan' => $query->where('created_at', '>=', $now->subDays(7)),
                'bulanan' => $query->whereYear('created_at', $now->year)->whereMonth('created_at', $now->month),
                default => null,
            };
        }

        $start = $request->query('startDate');
        $end = $request->query('endDate');

        if (is_string($start) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $start)) {
            $query->whereDate('created_at', '>=', $start);
        }
        if (is_string($end) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
            $query->whereDate('created_at', '<=', $end);
        }
    }
}
