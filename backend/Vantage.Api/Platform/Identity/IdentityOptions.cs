namespace Vantage.Api.Platform.Identity;

public sealed class IdentityOptions
{
    public string Authority { get; set; } = "http://localhost:8180/realms/vantage";
    public string MetadataAddress { get; set; } = "http://localhost:8180/realms/vantage/.well-known/openid-configuration";
    public string IntrospectionEndpoint { get; set; } = "http://localhost:8180/realms/vantage/protocol/openid-connect/token/introspect";
    public string RevocationEndpoint { get; set; } = "http://localhost:8180/realms/vantage/protocol/openid-connect/revoke";
    public string ClientId { get; set; } = "vantage";
    public string ClientSecret { get; set; } = "";
    public string PublicOrigin { get; set; } = "http://127.0.0.1:5080";
    public bool AllowLoopbackHttp { get; set; }
    public int SessionMinutes { get; set; } = 30;
    public int CheckIntervalSeconds { get; set; } = 15;
    public int ProviderTimeoutSeconds { get; set; } = 3;
    public bool Configured => !string.IsNullOrWhiteSpace(ClientSecret);
    public void Validate()
    {
        foreach (var address in new[] { Authority, MetadataAddress, IntrospectionEndpoint, RevocationEndpoint, PublicOrigin })
        {
            if (!Uri.TryCreate(address, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https") || !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Fragment))
                throw new InvalidOperationException("Identity endpoints must be explicit HTTP(S) URLs without credentials or fragments.");
            if (uri.Scheme != "https" && !AllowLoopbackHttp)
                throw new InvalidOperationException("Identity requires HTTPS unless the explicit local loopback development mode is enabled.");
        }
        var origin = new Uri(PublicOrigin);
        if (origin.AbsolutePath != "/" || !string.IsNullOrEmpty(origin.Query) ||
            (AllowLoopbackHttp && (!origin.IsLoopback || !new Uri(Authority).IsLoopback)))
            throw new InvalidOperationException("Local HTTP identity mode requires loopback public app/provider origins.");
        if (SessionMinutes is < 1 or > 30 || CheckIntervalSeconds is < 1 or > 15 || ProviderTimeoutSeconds is < 1 or > 3)
            throw new InvalidOperationException("Session lifetime/check bounds exceed the supported prototype limits.");
    }
}
