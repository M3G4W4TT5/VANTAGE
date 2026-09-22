using System.Net;
using System.Net.Http.Json;
using System.Net.WebSockets;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;
using Xunit;

namespace Vantage.Api.Tests;

public sealed class AuthenticationTests
{
    [Fact]
    public async Task SignedOutShellAssetsLoadWhileApiAndLiveEndpointsRemainProtected()
    {
        var webRoot = Path.Combine(Path.GetTempPath(), "vantage-public-assets-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(webRoot, "assets"));
        try
        {
            await File.WriteAllTextAsync(Path.Combine(webRoot, "index.html"), "<!doctype html><title>VANTAGE fixture sign-in</title>");
            await File.WriteAllTextAsync(Path.Combine(webRoot, "assets", "app.js"), "window.fixtureShell = true;");
            await File.WriteAllTextAsync(Path.Combine(webRoot, "assets", "app.css"), ":root { color-scheme: dark light; }");
            // No database is needed for a signed-out shell or rejected protected requests.
            await using var app = new AuthenticationApp("Host=127.0.0.1;Port=1;Database=unused;Username=unused;Timeout=1", webRoot: webRoot);
            using var client = app.CreateClient(new() { AllowAutoRedirect = false });
            foreach (var path in new[] { "/", "/assets/app.js", "/assets/app.css" })
                Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(path)).StatusCode);
            Assert.Contains("window.fixtureShell", await client.GetStringAsync("/assets/app.js"));
            Assert.Contains("color-scheme", await client.GetStringAsync("/assets/app.css"));
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/workspaces")).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/aircraft")).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/hubs/observations/negotiate?negotiateVersion=1", null)).StatusCode);
        }
        finally { Directory.Delete(webRoot, recursive: true); }
    }

    [Fact]
    public async Task ConcurrentSessionIssuanceHonorsLimitAndExpiredSessionsReleaseCapacity()
    {
        var time = new ControlledTime();
        var sessions = new BackendSessions(Options.Create(new IdentityOptions()), time);
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var requests = Enumerable.Range(0, 80).Select(_ => Task.Run(async () =>
        {
            await start.Task;
            try { return await StoreSession(sessions, time, lifetime: TimeSpan.FromSeconds(2)); }
            catch (InvalidOperationException) { return null; }
        })).ToArray();
        start.SetResult();
        var accepted = (await Task.WhenAll(requests)).OfType<string>().ToArray();
        Assert.Equal(64, accepted.Length); Assert.Equal(64, sessions.Active.Length);
        using var oldLease = sessions.Acquire(accepted[0], TestIdentity.Owner.Id);
        time.Advance(TimeSpan.FromSeconds(2));
        var replacement = await StoreSession(sessions, time);
        Assert.Equal(replacement, Assert.Single(sessions.Active).Id);
        Assert.True(oldLease.Cancellation.IsCancellationRequested);
    }

    [PostgresFact]
    public async Task RealCookieBoundaryRejectsAnonymousForgeryAndForeignOriginAndLogoutInvalidatesReplay()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        await using var app = new AuthenticationApp(database.Connection);
        using var anonymous = app.CreateClient(new() { AllowAutoRedirect = false });
        Assert.False((await anonymous.GetFromJsonAsync<SessionDto>("/api/v1/session"))!.Authenticated);
        foreach (var path in new[] { "/api/v1/workspaces", "/api/v1/aircraft", "/api/v1/earthquakes", "/api/v1/aircraft/observations/unknown", "/api/v1/earthquakes/observations/unknown", "/api/openapi/v1.json" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync("/hubs/observations/negotiate?negotiateVersion=1", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync("/auth/logout", null)).StatusCode);

        var login = await TestIdentity.IssueAsync(app); using var client = login.Client;
        var sessions = app.Services.GetRequiredService<BackendSessions>();
        using var lease = sessions.Acquire(login.SessionId, TestIdentity.Owner.Id);
        var session = (await client.GetFromJsonAsync<SessionDto>("/api/v1/session"))!;
        Assert.True(session.Authenticated); Assert.NotNull(session.CsrfToken); Assert.NotNull(session.SessionKey);
        Assert.NotEqual(login.SessionId, session.SessionKey);
        var publicSession = JsonSerializer.Serialize(session);
        Assert.DoesNotContain("refresh_token", publicSession); Assert.DoesNotContain("fixture-refresh-token", publicSession); Assert.DoesNotContain(login.SessionId, publicSession);
        client.DefaultRequestHeaders.Remove("X-VANTAGE-CSRF");
        foreach (var path in new[] { "/api/v1/workspaces", "/auth/logout", "/hubs/observations/negotiate?negotiateVersion=1" })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(path, new { name = "forged" })).StatusCode);
        Assert.False(lease.Cancellation.IsCancellationRequested);
        client.DefaultRequestHeaders.Add("X-VANTAGE-CSRF", "invalid-antiforgery-token");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/workspaces", new { name = "forged" })).StatusCode);
        client.DefaultRequestHeaders.Remove("X-VANTAGE-CSRF"); client.DefaultRequestHeaders.Add("X-VANTAGE-CSRF", login.CsrfToken);
        client.DefaultRequestHeaders.Add("Origin", "https://foreign.example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/v1/workspaces", new { name = "forged" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/hubs/observations")).StatusCode);
        client.DefaultRequestHeaders.Remove("Origin"); client.DefaultRequestHeaders.Add("Origin", TestIdentity.Origin);
        var created = await client.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("Retained after logout"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var workspace = (await created.Content.ReadFromJsonAsync<WorkspaceDto>())!;
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/hubs/observations/negotiate?negotiateVersion=1", null)).StatusCode);
        var logout = await client.PostAsync("/auth/logout", null);
        Assert.Equal(HttpStatusCode.Redirect, logout.StatusCode);
        Assert.DoesNotContain("id_token_hint", logout.Headers.Location!.OriginalString);
        Assert.DoesNotContain("refresh", logout.Headers.Location.OriginalString);
        Assert.True(lease.Cancellation.IsCancellationRequested); Assert.Null(sessions.Find(login.SessionId));
        Assert.Equal(1, ((TestSessionProbe)app.Services.GetRequiredService<IIdentitySessionProbe>()).Revocations);
        // This client deliberately retains the original cookie rather than honoring Set-Cookie deletion.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/workspaces")).StatusCode);
        Assert.False((await client.GetFromJsonAsync<SessionDto>("/api/v1/session"))!.Authenticated);
        using var newClient = await app.CreateAuthorizedClientAsync();
        Assert.Equal(workspace.Id, (await newClient.GetFromJsonAsync<WorkspaceDto>($"/api/v1/workspaces/{workspace.Id}"))!.Id);
        Assert.True(lease.Cancellation.IsCancellationRequested); // New login never restarts stopped work.
    }

    [PostgresFact]
    public async Task AuthenticatedSignalRStreamsReleaseOnlyTheTerminatedSessionsDemand()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        var source = new BlockingAircraftSource();
        await using var app = new AuthenticationApp(database.Connection, source);
        var first = await TestIdentity.IssueAsync(app); var second = await TestIdentity.IssueAsync(app);
        using var firstClient = first.Client; using var secondClient = second.Client;
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        using var socketOne = await ConnectStream(app, first.Cookie, timeout.Token);
        using var socketTwo = await ConnectStream(app, second.Cookie, timeout.Token);
        await source.Started.Task.WaitAsync(timeout.Token);
        Assert.Equal(1, source.Requests);
        Assert.Equal(HttpStatusCode.Redirect, (await firstClient.PostAsync("/auth/logout", null)).StatusCode);
        await ExpectClosed(socketOne, timeout.Token);
        Assert.False(source.Cancelled.Task.IsCompleted);
        Assert.NotNull(app.Services.GetRequiredService<BackendSessions>().Find(second.SessionId));
        Assert.Equal(HttpStatusCode.OK, (await secondClient.GetAsync("/api/v1/workspaces")).StatusCode);
        Assert.Equal(HttpStatusCode.Redirect, (await secondClient.PostAsync("/auth/logout", null)).StatusCode);
        await ExpectClosed(socketTwo, timeout.Token);
        await source.Cancelled.Task.WaitAsync(timeout.Token);
        Assert.Equal(1, source.Requests);
    }

    [PostgresFact]
    public async Task BoundedMonitorRevokesDataDemandAndSessionsWithoutFurtherBrowserTraffic()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        var time = new ControlledTime();
        var options = Options.Create(new IdentityOptions { SessionMinutes = 30, CheckIntervalSeconds = 15, ProviderTimeoutSeconds = 1 });
        var services = new ServiceCollection(); services.AddDbContext<VantageDbContext>(o => o.UseNpgsql(database.Connection, pg => pg.UseNetTopologySuite()));
        await using var provider = services.BuildServiceProvider();
        var probe = new TestSessionProbe(); var sessions = new BackendSessions(options, time);
        var monitor = new SessionMonitor(sessions, provider.GetRequiredService<IServiceScopeFactory>(), probe, options, time);
        var sessionOne = await StoreSession(sessions, time); var sessionTwo = await StoreSession(sessions, time);
        using var firstLease = sessions.Acquire(sessionOne, TestIdentity.Owner.Id);
        using var secondLease = sessions.Acquire(sessionTwo, TestIdentity.Owner.Id);
        sessions.Terminate(sessionOne);
        Assert.True(firstLease.Cancellation.IsCancellationRequested); Assert.False(secondLease.Cancellation.IsCancellationRequested);
        await SetUser(database, user => user.CanUseData = false);
        time.Advance(TimeSpan.FromSeconds(14)); await monitor.CheckAsync(); Assert.False(secondLease.Cancellation.IsCancellationRequested);
        time.Advance(TimeSpan.FromSeconds(1)); await monitor.CheckAsync();
        Assert.True(secondLease.Cancellation.IsCancellationRequested); Assert.NotNull(sessions.Find(sessionTwo));
        Assert.Equal(403, Assert.Throws<PlatformAccessException>(() => sessions.Acquire(sessionTwo, TestIdentity.Owner.Id)).Status);
        // This contract is the future recording cancellation seam, not a recording implementation.
        await SetUser(database, user => user.CanUseData = true);
        time.Advance(TimeSpan.FromSeconds(15)); await monitor.CheckAsync();
        using var restoredLease = sessions.Acquire(sessionTwo, TestIdentity.Owner.Id);
        Assert.False(restoredLease.Cancellation.IsCancellationRequested); Assert.True(secondLease.Cancellation.IsCancellationRequested);
        await SetUser(database, user => user.AccessRevision++);
        time.Advance(TimeSpan.FromSeconds(15)); await monitor.CheckAsync();
        Assert.True(restoredLease.Cancellation.IsCancellationRequested); Assert.Null(sessions.Find(sessionTwo));

        var expired = await StoreSession(sessions, time, lifetime: TimeSpan.FromSeconds(5));
        using var expiryLease = sessions.Acquire(expired, TestIdentity.Owner.Id);
        time.Advance(TimeSpan.FromSeconds(5)); await monitor.CheckAsync();
        Assert.True(expiryLease.Cancellation.IsCancellationRequested); Assert.Null(sessions.Find(expired));
        var revoked = await StoreSession(sessions, time, revision: 2); using var revokedLease = sessions.Acquire(revoked, TestIdentity.Owner.Id);
        probe.Active = false; time.Advance(TimeSpan.FromSeconds(15)); await monitor.CheckAsync();
        Assert.True(revokedLease.Cancellation.IsCancellationRequested); Assert.Null(sessions.Find(revoked));
        probe.Active = true; probe.Failure = new HttpRequestException("Synthetic provider outage");
        var unavailable = await StoreSession(sessions, time, revision: 2); using var unavailableLease = sessions.Acquire(unavailable, TestIdentity.Owner.Id);
        time.Advance(TimeSpan.FromSeconds(15)); await monitor.CheckAsync();
        Assert.True(unavailableLease.Cancellation.IsCancellationRequested); Assert.Null(sessions.Find(unavailable));
        probe.Failure = null; probe.WaitUntilCancelled = true;
        var timedOut = await StoreSession(sessions, time, revision: 2); using var timeoutLease = sessions.Acquire(timedOut, TestIdentity.Owner.Id);
        time.Advance(TimeSpan.FromSeconds(15)); var elapsed = Stopwatch.StartNew(); await monitor.CheckAsync();
        Assert.True(timeoutLease.Cancellation.IsCancellationRequested); Assert.InRange(elapsed.Elapsed, TimeSpan.FromMilliseconds(800), TimeSpan.FromSeconds(5));
        probe.WaitUntilCancelled = false;
        var disabled = await StoreSession(sessions, time, revision: 2); using var disabledLease = sessions.Acquire(disabled, TestIdentity.Owner.Id);
        await SetUser(database, user => user.Enabled = false);
        time.Advance(TimeSpan.FromSeconds(15)); await monitor.CheckAsync();
        Assert.True(disabledLease.Cancellation.IsCancellationRequested);
        Assert.Empty(sessions.Active);
    }

    [PostgresFact]
    public async Task ValidatedProviderClaimsRequireExplicitIssuerSubjectMappingBeforeTicketAdmission()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        await using var app = new AuthenticationApp(database.Connection);
        using var scope = app.Services.CreateScope();
        var options = scope.ServiceProvider.GetRequiredService<IOptionsMonitor<OpenIdConnectOptions>>().Get(OpenIdConnectDefaults.AuthenticationScheme);
        Assert.Equal("code", options.ResponseType); Assert.True(options.UsePkce); Assert.True(options.SaveTokens);
        foreach (var (issuer, subject, expected) in new[] {
            (TestIdentity.Owner.Issuer, TestIdentity.Owner.Subject, true),
            ("https://untrusted.example.test/realms/fixture", TestIdentity.Owner.Subject, false),
            (TestIdentity.Owner.Issuer, "different-provider-user", false) })
        {
            var context = new TokenValidatedContext(new DefaultHttpContext { RequestServices = scope.ServiceProvider },
                new AuthenticationScheme(OpenIdConnectDefaults.AuthenticationScheme, null, typeof(OpenIdConnectHandler)), options,
                new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("sub", subject), new Claim("email", "same-display-email@example.test") }, "validated-fixture")), new AuthenticationProperties())
            {
                // Invokes the post-cryptographic-validation ownership gate; it is not a provider-flow test.
                SecurityToken = new JwtSecurityToken(issuer: issuer)
            };
            await options.Events.OnTokenValidated(context);
            if (expected)
            {
                Assert.Equal(TestIdentity.Owner.Id, context.Principal!.FindFirstValue(SessionClaims.UserId));
                Assert.Equal(subject, context.Principal!.FindFirstValue(SessionClaims.Subject));
                Assert.Equal(TestIdentity.Owner.Id, context.Principal!.FindFirstValue(ClaimTypes.NameIdentifier));
                Assert.Null(context.Result?.Failure);
                // ASP.NET's real no-userinfo flow applies ClaimActions AFTER TokenValidated.
                // Its defaults remove raw 'iss', so session identity must survive in platform claims.
                using var payload = JsonDocument.Parse("{}");
                foreach (var action in options.ClaimActions)
                    action.Run(payload.RootElement, (ClaimsIdentity)context.Principal!.Identity!, issuer);
                Assert.Null(context.Principal!.FindFirstValue("iss"));
                context.Properties!.StoreTokens([new AuthenticationToken { Name = "refresh_token", Value = "fixture-refresh-token" }]);
                var sessions = app.Services.GetRequiredService<BackendSessions>();
                var id = await sessions.StoreAsync(new AuthenticationTicket(context.Principal!, context.Properties, CookieAuthenticationDefaults.AuthenticationScheme));
                var stored = sessions.Find(id)!;
                Assert.Equal(issuer, stored.Probe.Issuer); Assert.Equal(subject, stored.Probe.Subject);
                stored.CheckedAt = DateTimeOffset.UtcNow.AddSeconds(-16);
                var probe = (TestSessionProbe)app.Services.GetRequiredService<IIdentitySessionProbe>();
                var checks = probe.Checks;
                await app.Services.GetRequiredService<SessionMonitor>().CheckAsync();
                Assert.NotNull(sessions.Find(id)); Assert.True(probe.Checks > checks);
            }
            else Assert.NotNull(context.Result?.Failure);
        }
        await using var check = database.CreateContext();
        Assert.Single(await check.Users.ToListAsync()); // Successful IdP login never provisions or claims an owner implicitly.
    }

    [PostgresFact]
    public async Task DataAccessRevocationPreservesWorkspaceAccessAndRestartRejectsOldCookies()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        string cookie;
        await using (var app = new AuthenticationApp(database.Connection))
        {
            var login = await TestIdentity.IssueAsync(app); using var client = login.Client; cookie = login.Cookie;
            var sessions = app.Services.GetRequiredService<BackendSessions>(); using var lease = sessions.Acquire(login.SessionId, TestIdentity.Owner.Id);
            await SetUser(database, user => user.CanUseData = false);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/aircraft")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/workspaces")).StatusCode);
            var refreshed = (await client.GetFromJsonAsync<SessionDto>("/api/v1/session"))!;
            Assert.True(refreshed.Authenticated); Assert.False(refreshed.User!.CanUseData); Assert.True(lease.Cancellation.IsCancellationRequested);
        }
        await using var restarted = new AuthenticationApp(database.Connection);
        using var replay = restarted.CreateClient(new() { AllowAutoRedirect = false }); replay.DefaultRequestHeaders.Add("Cookie", cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, (await replay.GetAsync("/api/v1/workspaces")).StatusCode);
        Assert.False((await replay.GetFromJsonAsync<SessionDto>("/api/v1/session"))!.Authenticated);
    }

    [Theory]
    [InlineData("{\"active\":false}", false)]
    [InlineData("{\"active\":true,\"iss\":\"wrong\",\"sub\":\"fixture-subject\",\"client_id\":\"vantage\"}", false)]
    [InlineData("{\"active\":true,\"iss\":\"https://identity.example.test/realms/fixture\",\"sub\":\"wrong\",\"client_id\":\"vantage\"}", false)]
    [InlineData("{\"active\":true,\"iss\":\"https://identity.example.test/realms/fixture\",\"sub\":\"fixture-subject\",\"client_id\":\"wrong\"}", false)]
    [InlineData("{\"active\":true,\"iss\":\"https://identity.example.test/realms/fixture\",\"sub\":\"fixture-subject\",\"client_id\":\"vantage\"}", true)]
    public async Task IntrospectionRequiresMatchingActiveProviderIdentity(string body, bool expected)
    {
        using var http = new HttpClient(new ProbeResponse(body));
        var probe = new IdentitySessionProbe(http, Options.Create(new IdentityOptions { ClientSecret = "fixture-client-secret" }));
        Assert.Equal(expected, await probe.IsActiveAsync(new(TestIdentity.Owner.Issuer, TestIdentity.Owner.Subject, "fixture-refresh-token"), default));
    }

    private static async Task SetUser(IsolatedDatabase database, Action<PlatformUserRow> update)
    {
        await using var db = database.CreateContext(); var user = await db.Users.SingleAsync(); update(user); await db.SaveChangesAsync();
    }
    private static async Task<string> StoreSession(BackendSessions sessions, TimeProvider time, long revision = 1, TimeSpan? lifetime = null)
    {
        var id = Guid.NewGuid().ToString("N");
        var user = new PlatformUserRow { Id = TestIdentity.Owner.Id, Issuer = TestIdentity.Owner.Issuer, Subject = TestIdentity.Owner.Subject, DisplayName = "Fixture", AccessRevision = revision };
        var properties = new AuthenticationProperties { ExpiresUtc = time.GetUtcNow() + (lifetime ?? TimeSpan.FromMinutes(20)) };
        properties.StoreTokens([new AuthenticationToken { Name = "refresh_token", Value = "fixture-refresh-token" }]);
        await sessions.StoreAsync(new AuthenticationTicket(TestIdentity.Principal(user, id), properties, CookieAuthenticationDefaults.AuthenticationScheme));
        return id;
    }
    private static async Task<WebSocket> ConnectStream(AuthenticationApp app, string cookie, CancellationToken ct)
    {
        var client = app.Server.CreateWebSocketClient();
        client.ConfigureRequest = request => { request.Headers.Cookie = cookie; request.Headers.Origin = TestIdentity.Origin; };
        var socket = await client.ConnectAsync(new Uri("ws://localhost/hubs/observations"), ct);
        await socket.SendAsync(Encoding.UTF8.GetBytes("{\"protocol\":\"json\",\"version\":1}\u001e"), WebSocketMessageType.Text, true, ct);
        var buffer = new byte[65536]; var result = await socket.ReceiveAsync(buffer, ct);
        Assert.Contains("{}", Encoding.UTF8.GetString(buffer, 0, result.Count));
        await socket.SendAsync(Encoding.UTF8.GetBytes("{\"type\":4,\"invocationId\":\"fixture\",\"target\":\"Aircraft\",\"arguments\":[{\"longitude\":12,\"latitude\":58,\"radiusNm\":250}]}\u001e"), WebSocketMessageType.Text, true, ct);
        result = await socket.ReceiveAsync(buffer, ct);
        Assert.Contains("\"reset\":true", Encoding.UTF8.GetString(buffer, 0, result.Count));
        return socket;
    }
    private static async Task ExpectClosed(WebSocket socket, CancellationToken ct)
    {
        var buffer = new byte[65536];
        try
        {
            while (true)
            {
                var result = await socket.ReceiveAsync(buffer, ct);
                if (result.MessageType == WebSocketMessageType.Close) return;
                if (Encoding.UTF8.GetString(buffer, 0, result.Count).Contains("\"type\":7", StringComparison.Ordinal)) return;
            }
        }
        catch (WebSocketException) { }
    }
    private sealed class ControlledTime : TimeProvider
    {
        private DateTimeOffset now = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(TimeSpan duration) => now += duration;
    }
    private sealed class ProbeResponse(string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
    }
    private sealed class BlockingAircraftSource : IAircraftSource
    {
        public AircraftSourceDto Metadata => new("fixture-aircraft", "Fixture", "https://example.test", "https://example.test/terms", "Fixture", ["bounded_query"], 30, 500, 250, 24, 10, "Fixture");
        public bool Enabled => true;
        public TimeSpan MinimumRequestInterval => TimeSpan.Zero;
        public int Requests { get; private set; }
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Cancelled { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public async Task<AircraftFetch> FetchAsync(AircraftQuery query, CancellationToken ct)
        {
            Requests++; Started.TrySetResult();
            try { await Task.Delay(Timeout.Infinite, ct); }
            finally { if (ct.IsCancellationRequested) Cancelled.TrySetResult(); }
            throw new InvalidOperationException("Synthetic blocking source cannot complete.");
        }
    }
    private sealed class AuthenticationApp(string connection, IAircraftSource? aircraft = null, string? webRoot = null) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            if (webRoot is not null) builder.UseWebRoot(webRoot);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<VantageDbContext>>(); services.RemoveAll<IDbContextOptionsConfiguration<VantageDbContext>>();
                services.AddDbContext<VantageDbContext>(o => o.UseNpgsql(connection, pg => pg.UseNetTopologySuite()));
                services.AddTestIdentity();
                if (aircraft is not null) { services.RemoveAll<IAircraftSource>(); services.AddSingleton(aircraft); }
            });
        }
    }
}
