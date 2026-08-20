<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\MenuItemController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\SalesSummaryController;
use App\Http\Controllers\Api\TableController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

// Akses publik (Menu Pesan Mandiri / katalog pelanggan tanpa login):
// kategori, menu, daftar meja, dan pembuatan order self-order.
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/menu-items', [MenuItemController::class, 'index']);
Route::get('/tables', [TableController::class, 'index']);
Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:20,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    Route::middleware('role:admin')->group(function () {
        Route::post('/menu-items', [MenuItemController::class, 'store']);
        Route::put('/menu-items/{menuItem}', [MenuItemController::class, 'update']);
        Route::delete('/menu-items/{menuItem}', [MenuItemController::class, 'destroy']);

        Route::post('/tables', [TableController::class, 'store']);
        Route::put('/tables/{table}', [TableController::class, 'update']);
        Route::delete('/tables/{table}', [TableController::class, 'destroy']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);

        Route::get('/sales-summary', [SalesSummaryController::class, 'index']);
    });

    Route::get('/orders', [OrderController::class, 'index'])->middleware('role:kasir,pelayan,dapur,admin');
    Route::patch('/orders/{order}/confirm', [OrderController::class, 'confirm'])->middleware('role:kasir,admin');
    Route::patch('/orders/{order}/items/{itemId}', [OrderController::class, 'updateItemStatus'])->middleware('role:dapur,pelayan,admin');
    Route::post('/orders/{order}/payments', [PaymentController::class, 'store'])->middleware('role:kasir,admin');
});