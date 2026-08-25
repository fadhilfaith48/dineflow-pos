<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class SettingsChanged implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    /**
     * @param  array{taxRate: int, restaurantName: string, restaurantAddress: string, logoUrl: ?string}  $settings
     */
    public function __construct(
        public array $settings,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('settings')];
    }

    public function broadcastAs(): string
    {
        return 'SettingsChanged';
    }
}
