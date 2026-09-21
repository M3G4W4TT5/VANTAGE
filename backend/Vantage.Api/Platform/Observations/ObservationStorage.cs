using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using NJsonSchema;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
namespace Vantage.Api.Platform.Observations;

public sealed class ObservationRow
{
    public string Id { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string SourceId { get; set; } = "";
    public string DataType { get; set; } = "";
    public DateTimeOffset? ObservedAt { get; set; }
    public DateTimeOffset RetrievedAt { get; set; }
    public Point? Position { get; set; }
    public string RecordJson { get; set; } = "{}";
    public string RawJson { get; set; } = "{}";
}
public sealed class ObservationValidation(JsonSchema schema)
{
    public static async Task<ObservationValidation> LoadAsync() => new(await JsonSchema.FromFileAsync(
        Path.Combine(AppContext.BaseDirectory, "Schemas", "records.schema.json")));
    public void Validate<T>(string definition, T record)
    {
        if (schema.Definitions[definition].Validate(JsonSerializer.Serialize(record, ContractJson.Options)).Count > 0)
            throw new SourceException("error", "The source adapter returned an invalid normalized observation.");
    }
}
public static class ObservationRetention
{
    public static async Task PruneAsync(VantageDbContext db, string dataType, string sourceId, DateTimeOffset cutoff, int limit, CancellationToken ct)
    {
        var scope = db.Observations.Where(x => x.DataType == dataType && x.SourceId == sourceId);
        await scope.Where(x => x.RetrievedAt < cutoff).ExecuteDeleteAsync(ct);
        var excess = scope.OrderByDescending(x => x.RetrievedAt).ThenBy(x => x.Id).Skip(limit).Select(x => x.Id);
        await scope.Where(x => excess.Contains(x.Id)).ExecuteDeleteAsync(ct);
    }
}
public static class BatchChanges
{
    public static (T[] Upserts, string[] Removals) Between<T>(T[] old, T[] current, Func<T, string> entityId, Func<T, string> observationId)
    {
        var before = old.ToDictionary(entityId, observationId); var ids = current.Select(entityId).ToHashSet();
        return (current.Where(x => !before.TryGetValue(entityId(x), out var id) || id != observationId(x)).ToArray(),
            before.Keys.Where(x => !ids.Contains(x)).ToArray());
    }
}
