using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Vantage.Api.Persistence;

namespace Vantage.Api.Platform.Identity;

public static class AuthenticationSetup
{
    public static void AddPlatformAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = configuration.GetSection("Identity").Get<IdentityOptions>() ?? new();
        // CLI migration/OpenAPI generation work without an identity service. Normal login fails closed when unconfigured.
        if (settings.Configured) settings.Validate();
        services.Configure<IdentityOptions>(configuration.GetSection("Identity"));
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<BackendSessions>();
        services.AddSingleton<ISessionLifetime>(sp => sp.GetRequiredService<BackendSessions>());
        services.AddHttpClient<IIdentitySessionProbe, IdentitySessionProbe>(http => http.Timeout = TimeSpan.FromSeconds(settings.ProviderTimeoutSeconds))
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        services.AddSingleton<SessionMonitor>();
        services.AddHostedService(sp => sp.GetRequiredService<SessionMonitor>());
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-VANTAGE-CSRF";
            options.Cookie.Name = "vantage.csrf";
            options.Cookie.HttpOnly = true; options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = settings.AllowLoopbackHttp ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        });
        services.AddAuthentication(options =>
        {
            options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        }).AddCookie(options =>
        {
            options.Cookie.Name = "vantage.session"; options.Cookie.HttpOnly = true; options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = settings.AllowLoopbackHttp ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromMinutes(settings.SessionMinutes); options.SlidingExpiration = false;
            options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
            options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
            options.Events.OnValidatePrincipal = async context =>
            {
                var id = context.Principal?.FindFirstValue(SessionClaims.UserId);
                var revision = context.Principal?.FindFirstValue(SessionClaims.AccessRevision);
                var db = context.HttpContext.RequestServices.GetRequiredService<VantageDbContext>();
                var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, context.HttpContext.RequestAborted);
                if (user is not { Enabled: true } || user.AccessRevision.ToString() != revision)
                {
                    context.HttpContext.RequestServices.GetRequiredService<BackendSessions>().Terminate(context.Principal?.FindFirstValue(SessionClaims.SessionId) ?? "");
                    context.RejectPrincipal(); await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                }
            };
        }).AddOpenIdConnect(options =>
        {
            options.Authority = settings.Authority; options.MetadataAddress = settings.MetadataAddress;
            options.ClientId = settings.ClientId; options.ClientSecret = settings.ClientSecret;
            options.RequireHttpsMetadata = !settings.AllowLoopbackHttp;
            options.ResponseType = OpenIdConnectResponseType.Code; options.ResponseMode = OpenIdConnectResponseMode.Query;
            options.UsePkce = true; options.MapInboundClaims = false; options.SaveTokens = true;
            options.RemoteSignOutPath = PathString.Empty; // Only CSRF-protected local logout terminates browser sessions; provider revocation is monitored.
            options.UseTokenLifetime = false; options.GetClaimsFromUserInfoEndpoint = false;
            options.Scope.Clear(); options.Scope.Add("openid"); options.Scope.Add("profile");
            options.TokenValidationParameters.ValidIssuer = settings.Authority;
            options.TokenValidationParameters.NameClaimType = "preferred_username";
            options.BackchannelTimeout = TimeSpan.FromSeconds(10);
            options.BackchannelHttpHandler = new HttpClientHandler { AllowAutoRedirect = false };
            options.CorrelationCookie.SameSite = SameSiteMode.Lax; options.NonceCookie.SameSite = SameSiteMode.Lax;
            options.CorrelationCookie.SecurePolicy = options.NonceCookie.SecurePolicy = settings.AllowLoopbackHttp ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.Events.OnRedirectToIdentityProvider = context =>
            {
                context.ProtocolMessage.RedirectUri = settings.PublicOrigin.TrimEnd('/') + "/signin-oidc";
                return Task.CompletedTask;
            };
            options.Events.OnTokenValidated = async context =>
            {
                var issuer = context.SecurityToken.Issuer;
                var subject = context.Principal?.FindFirstValue("sub");
                var db = context.HttpContext.RequestServices.GetRequiredService<VantageDbContext>();
                var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Issuer == issuer && x.Subject == subject, context.HttpContext.RequestAborted);
                if (user is not { Enabled: true }) { context.Fail("This identity has no VANTAGE access."); return; }
                context.Principal = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                    new Claim(SessionClaims.UserId, user.Id), new Claim(SessionClaims.SessionId, Convert.ToHexString(RandomNumberGenerator.GetBytes(32))),
                    new Claim(SessionClaims.AccessRevision, user.AccessRevision.ToString()), new Claim("vantage_data", user.CanUseData ? "true" : "false"),
                    // OIDC's default ClaimActions remove protocol claims (including iss) after this event.
                    // Preserve the validated mapping in platform claims for later session checks.
                    new Claim(SessionClaims.Issuer, issuer), new Claim(SessionClaims.Subject, subject!),
                    new Claim(ClaimTypes.NameIdentifier, user.Id), new Claim(ClaimTypes.Name, user.DisplayName)
                }, CookieAuthenticationDefaults.AuthenticationScheme));
            };
            options.Events.OnTicketReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Properties?.GetTokenValue("refresh_token"))) { context.Fail("The provider did not supply a session validation token."); return Task.CompletedTask; }
                context.Properties.IsPersistent = false;
                context.Properties.ExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(settings.SessionMinutes);
                // Keep only the refresh token needed by server-side introspection/revocation.
                context.Properties.StoreTokens(context.Properties.GetTokens().Where(x => x.Name == "refresh_token").ToArray());
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToIdentityProviderForSignOut = context =>
            {
                context.ProtocolMessage.IdTokenHint = null;
                context.ProtocolMessage.ClientId = settings.ClientId;
                context.ProtocolMessage.PostLogoutRedirectUri = settings.PublicOrigin.TrimEnd('/') + "/signout-callback-oidc";
                return Task.CompletedTask;
            };
            options.Events.OnRemoteFailure = context =>
            {
                context.HandleResponse(); context.Response.Redirect("/?auth=failed"); return Task.CompletedTask;
            };
            options.Events.OnAuthenticationFailed = context =>
            {
                context.HandleResponse(); context.Response.Redirect("/?auth=failed"); return Task.CompletedTask;
            };
        });
        services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
            .Configure<BackendSessions>((options, store) => options.SessionStore = store);
        services.AddAuthorizationBuilder().SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
    }
}
