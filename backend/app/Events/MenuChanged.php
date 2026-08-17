<?php

namespace App\Events;

use App\Http\Resources\MenuItemResource;
use App\Models\MenuItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class MenuChanged implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public array $item;

    public function __construct(MenuItem $menuItem)
    {
        $this->item = (new MenuItemResource($menuItem))->resolve();
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('menu')];
    }

    public function broadcastAs(): string
    {
        return 'MenuChanged';
    }
}