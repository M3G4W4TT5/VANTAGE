using Microsoft.AspNetCore.SignalR;
using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Observations;

public sealed class ObservationsHub(AircraftCoordinator coordinator) : Hub
{
    // Reconnection starts an explicit reset snapshot. This source has no durable replay/resume token.
    public IAsyncEnumerable<AircraftBatchDto> Aircraft(AircraftQuery query, CancellationToken ct) => coordinator.Subscribe(query, ct);
}
