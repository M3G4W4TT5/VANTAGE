namespace Vantage.Api.Platform.Preferences;

public static class DisplayPreferences
{
    public const string DefaultRegion = "northern-europe";
    public const string DefaultTimeZone = "UTC";

    public static readonly IReadOnlyDictionary<string, (double Longitude, double Latitude, double Height)> Regions =
        new Dictionary<string, (double, double, double)>(StringComparer.Ordinal)
        {
            ["northern-europe"] = (12, 58, 2_400_000),
            ["denmark"] = (10.2, 56.1, 750_000),
            ["europe"] = (14, 51, 5_000_000),
            ["world"] = (0, 0, 20_000_000),
        };

    public static bool ValidTimeZone(string? zone)
    {
        if (string.IsNullOrWhiteSpace(zone) || zone.Length > 100) return false;
        try { _ = TimeZoneInfo.FindSystemTimeZoneById(zone); return true; }
        catch (TimeZoneNotFoundException) { return false; }
        catch (InvalidTimeZoneException) { return false; }
    }
}
