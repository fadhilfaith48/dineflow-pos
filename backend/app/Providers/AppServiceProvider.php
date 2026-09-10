<?php

namespace App\Providers;

use App\Services\Payment\DokuGateway;
use App\Services\Payment\MockQrisGateway;
use App\Services\Payment\PaymentGateway;
use App\Services\Payment\XenditGateway;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PaymentGateway::class, function () {
            return match (config('dinflow.payment_driver')) {
                'doku' => new DokuGateway,
                'xendit' => new XenditGateway,
                default => new MockQrisGateway,
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
