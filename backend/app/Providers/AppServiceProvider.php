<?php

namespace App\Providers;

use App\Services\Payment\DokuGateway;
use App\Services\Payment\PaymentGateway;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PaymentGateway::class, function () {
            return config('dinflow.payment_driver') === 'doku'
                ? new DokuGateway
                : new \App\Services\Payment\MockQrisGateway;
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
