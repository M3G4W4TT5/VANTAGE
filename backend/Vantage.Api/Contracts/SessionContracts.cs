namespace Vantage.Api.Contracts;

public sealed record SessionUserDto(string Id, string DisplayName, bool CanUseData);
public sealed record SessionDto(int SchemaVersion, bool Authenticated, SessionUserDto? User, DateTimeOffset? ExpiresAt,
    string? CsrfToken, string? SessionKey);
