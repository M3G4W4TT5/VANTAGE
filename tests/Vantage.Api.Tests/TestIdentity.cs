using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;

namespace Vantage.Api.Tests;

// Fixture tickets enter through the real cookie handler and BackendSessions. They are not OIDC acceptance.
internal static class TestIdentity
{
    public static InitialOperator Owner { get; } = new("fixture-owner", "https://identity.example.test/realms/fixture", "fixture-subject", "Fixture operator");
    public const string Origin = "http://localhost";
    internal sealed record DefaultUser(string Id);
    internal sealed record Login(HttpClient Client, string SessionId, string Cookie, string? CsrfToken);

    public static void AddTestIdentity(this IServiceCollection services, string? userId = null)
    {
        services.AddSingleton(new DefaultUser(userId ?? Owner.Id));
        services.RemoveAll<IIdentitySessionProbe>();
        services.AddSingleton<IIdentitySessionProbe, TestSessionProbe>();
        services.PostConfigure<IdentityOptions>(options => { options.PublicOrigin = Origin; options.AllowLoopbackHttp = true; });
        services.PostConfigure<AntiforgeryOptions>(options => options.Cookie.SecurePolicy = CookieSecurePolicy.None);
        services.PostConfigure<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme, options => options.Cookie.SecurePolicy = CookieSecurePolicy.None);
        services.PostConfigure<OpenIdConnectOptions>(OpenIdConnectDefaults.AuthenticationScheme, options =>
        {
            options.Configuration = new OpenIdConnectConfiguration { Issuer = Owner.Issuer, EndSessionEndpoint = "https://identity.example.test/logout" };
        });
    }

    public static async Task<HttpClient> CreateAuthorizedClientAsync(this WebApplicationFactory<Program> app) => (await IssueAsync(app)).Client;

    public static async Task<Login> IssueAsync(WebApplicationFactory<Program> app, string? userId = null, TimeSpan? lifetime = null)
    {
        using var scope = app.Services.CreateScope();
        userId ??= scope.ServiceProvider.GetRequiredService<DefaultUser>().Id;
        var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId)
            ?? new PlatformUserRow { Id = userId, Issuer = Owner.Issuer, Subject = "unregistered", DisplayName = "Unregistered fixture" };
        var sessionId = Guid.NewGuid().ToString("N");
        var principal = Principal(user, sessionId);
        var context = new DefaultHttpContext { RequestServices = scope.ServiceProvider, User = principal };
        context.Request.Scheme = "http"; context.Request.Host = new HostString("localhost");
        var properties = new AuthenticationProperties { ExpiresUtc = scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow() + (lifetime ?? TimeSpan.FromMinutes(20)), IsPersistent = false };
        properties.StoreTokens([new AuthenticationToken { Name = "refresh_token", Value = "fixture-refresh-token-" + sessionId }]);
        await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, properties);
        var cookie = context.Response.Headers.SetCookie.Select(value => value!.Split(';')[0]).Single(value => value.StartsWith("vantage.session=", StringComparison.Ordinal));
        var client = app.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri(Origin), AllowAutoRedirect = false, HandleCookies = false });
        client.DefaultRequestHeaders.Add("Cookie", cookie);
        var response = await client.GetAsync("/api/v1/session");
        response.EnsureSuccessStatusCode();
        var session = (await response.Content.ReadFromJsonAsync<SessionDto>())!;
        if (response.Headers.TryGetValues("Set-Cookie", out var additionalCookies))
        {
            client.DefaultRequestHeaders.Remove("Cookie");
            client.DefaultRequestHeaders.Add("Cookie", string.Join("; ", additionalCookies.Select(value => value.Split(';')[0]).Prepend(cookie)));
        }
        if (session.CsrfToken is not null) client.DefaultRequestHeaders.Add("X-VANTAGE-CSRF", session.CsrfToken);
        return new(client, sessionId, cookie, session.CsrfToken);
    }

    internal static ClaimsPrincipal Principal(PlatformUserRow user, string sessionId) => new(new ClaimsIdentity(new[] {
        new Claim(SessionClaims.UserId, user.Id), new Claim(SessionClaims.SessionId, sessionId),
        new Claim(SessionClaims.AccessRevision, user.AccessRevision.ToString()), new Claim("vantage_data", user.CanUseData ? "true" : "false"),
        new Claim(SessionClaims.Issuer, user.Issuer), new Claim(SessionClaims.Subject, user.Subject),
        new Claim(ClaimTypes.NameIdentifier, user.Id), new Claim(ClaimTypes.Name, user.DisplayName)
    }, CookieAuthenticationDefaults.AuthenticationScheme));

    internal sealed class ExplicitSession(string userId) : ICurrentSession
    {
        public string UserId => userId;
        public string SessionId => "independent-test-consumer";
    }
}

internal sealed class TestSessionProbe : IIdentitySessionProbe
{
    public bool Active { get; set; } = true;
    public Exception? Failure { get; set; }
    public bool WaitUntilCancelled { get; set; }
    public int Checks { get; private set; }
    public int Revocations { get; private set; }
    public async Task<bool> IsActiveAsync(SessionProbe session, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested(); Checks++;
        if (WaitUntilCancelled) await Task.Delay(Timeout.Infinite, ct);
        if (Failure is not null) throw Failure;
        return Active;
    }
    public Task RevokeAsync(SessionProbe session, CancellationToken ct) { Revocations++; return Task.CompletedTask; }
}
