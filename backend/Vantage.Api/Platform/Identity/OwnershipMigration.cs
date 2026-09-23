using Microsoft.EntityFrameworkCore;
using Vantage.Api.Persistence;

namespace Vantage.Api.Platform.Identity;

public sealed record InitialOperator(string Id, string Issuer, string Subject, string DisplayName)
{
    public static InitialOperator FromConfiguration(IConfiguration config)
    {
        var section = config.GetSection("Identity:InitialOperator");
        var result = new InitialOperator(section["Id"] ?? "", section["Issuer"] ?? "", section["Subject"] ?? "", section["DisplayName"] ?? "Operator");
        if (string.IsNullOrWhiteSpace(result.Id) || string.IsNullOrWhiteSpace(result.Subject) ||
            result.Id.Length > 160 || result.Subject.Length > 255 || !Uri.TryCreate(result.Issuer, UriKind.Absolute, out var issuer) ||
            issuer.Scheme is not ("http" or "https") || result.DisplayName.Length > 120)
            throw new InvalidOperationException("Configure Identity:InitialOperator with an explicit internal ID, issuer and subject before migration. No first-login ownership assignment is allowed.");
        return result;
    }
}
public static class OwnershipMigration
{
    public static async Task MigrateAsync(VantageDbContext db, InitialOperator owner, CancellationToken ct = default,
        IConfiguration? config = null)
    {
        await db.Database.OpenConnectionAsync(ct);
        try
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT set_config('vantage.initial_owner_id', {owner.Id}, false), set_config('vantage.initial_owner_issuer', {owner.Issuer}, false), set_config('vantage.initial_owner_subject', {owner.Subject}, false), set_config('vantage.initial_owner_name', {owner.DisplayName}, false)", ct);
            var aircraftProvider = config?["Sources:Aircraft:Provider"] ?? "adsb-lol";
            var earthquakeProvider = config?["Sources:Earthquakes:Provider"] ?? "usgs-earthquakes";
            if (aircraftProvider != "adsb-lol" || earthquakeProvider != "usgs-earthquakes")
                throw new InvalidOperationException("The legacy provider selection is not supported by the step-5 connection migration.");
            var aircraftPoll = Math.Clamp(config?.GetValue<int?>("Sources:AdsbLol:PollSeconds") ?? 30, 30, 600);
            var earthquakePoll = Math.Clamp(config?.GetValue<int?>("Sources:Usgs:PollSeconds") ?? 60, 60, 3600);
            var aircraftEnabled = config?.GetValue<bool?>("Sources:AdsbLol:Enabled") ?? true;
            var earthquakeEnabled = config?.GetValue<bool?>("Sources:Usgs:Enabled") ?? true;
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT set_config('vantage.legacy_aircraft_poll', {aircraftPoll.ToString()}, false), set_config('vantage.legacy_earthquake_poll', {earthquakePoll.ToString()}, false), set_config('vantage.legacy_aircraft_enabled', {aircraftEnabled.ToString().ToLowerInvariant()}, false), set_config('vantage.legacy_earthquake_enabled', {earthquakeEnabled.ToString().ToLowerInvariant()}, false)", ct);
            await db.Database.MigrateAsync(ct);
            var provisioned = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == owner.Id, ct);
            if (provisioned is null || provisioned.Issuer != owner.Issuer || provisioned.Subject != owner.Subject)
                throw new InvalidOperationException("Configured initial operator differs from persisted ownership. Verify identity recovery; automatic reassignment is forbidden.");
        }
        finally { await db.Database.CloseConnectionAsync(); }
    }
}
